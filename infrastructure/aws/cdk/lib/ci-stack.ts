import { CfnOutput, Stack, type StackProps } from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import type { Construct } from "constructs";

export interface CiStackProps extends StackProps {
  /** "owner/repo" allowed to deploy from its main branch. */
  githubRepo: string;
  clusterArn: string;
  /**
   * "oidc" (default): a role GitHub assumes through its OIDC provider, no
   * stored keys. "user": an IAM user whose access key is kept as a GitHub
   * secret, for AWS project accounts, whose service control policy blocks
   * creating OIDC providers.
   */
  auth?: "oidc" | "user";
}

/**
 * Identity used by .github/workflows/deploy-aws.yml. It may only use the CDK
 * bootstrap roles (to deploy) and connect to the database as admin (to run
 * migrations and to prerender pages during the build).
 */
export class CiStack extends Stack {
  constructor(scope: Construct, id: string, props: CiStackProps) {
    super(scope, id, props);
    const statements = [
      new iam.PolicyStatement({
        actions: ["sts:AssumeRole"],
        resources: [`arn:${this.partition}:iam::${this.account}:role/cdk-*`],
      }),
      new iam.PolicyStatement({ actions: ["dsql:DbConnectAdmin"], resources: [props.clusterArn] }),
    ];

    if (props.auth === "user") {
      // The access key is created with the CLI (docs/deployment/aws.md), so
      // the secret never appears in CloudFormation.
      const user = new iam.User(this, "DeployUser", { userName: "usba-github-deploy" });
      for (const s of statements) user.addToPolicy(s);
      new CfnOutput(this, "DeployUserName", { value: user.userName });
      return;
    }

    const provider = new iam.OpenIdConnectProvider(this, "GitHub", {
      url: "https://token.actions.githubusercontent.com",
      clientIds: ["sts.amazonaws.com"],
    });
    const role = new iam.Role(this, "DeployRole", {
      description: "GitHub Actions deploy for the USBA store",
      assumedBy: new iam.WebIdentityPrincipal(provider.openIdConnectProviderArn, {
        StringEquals: { "token.actions.githubusercontent.com:aud": "sts.amazonaws.com" },
        StringLike: {
          "token.actions.githubusercontent.com:sub": `repo:${props.githubRepo}:ref:refs/heads/main`,
        },
      }),
    });
    for (const s of statements) role.addToPolicy(s);
    new CfnOutput(this, "DeployRoleArn", { value: role.roleArn });
  }
}
