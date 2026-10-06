import { CfnOutput, Stack, type StackProps } from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import type { Construct } from "constructs";

export interface CiStackProps extends StackProps {
  /** "owner/repo" allowed to deploy from its main branch. */
  githubRepo: string;
  clusterArn: string;
}

/**
 * Role assumed by .github/workflows/deploy-aws.yml through GitHub's OIDC
 * provider: no long-lived AWS keys in GitHub. It may only use the CDK
 * bootstrap roles (to deploy) and connect to the database as admin (to run
 * migrations and to prerender pages during the build).
 */
export class CiStack extends Stack {
  constructor(scope: Construct, id: string, props: CiStackProps) {
    super(scope, id, props);
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
    role.addToPolicy(
      new iam.PolicyStatement({
        actions: ["sts:AssumeRole"],
        resources: [`arn:${this.partition}:iam::${this.account}:role/cdk-*`],
      }),
    );
    role.addToPolicy(
      new iam.PolicyStatement({ actions: ["dsql:DbConnectAdmin"], resources: [props.clusterArn] }),
    );
    new CfnOutput(this, "DeployRoleArn", { value: role.roleArn });
  }
}
