import { Stack, type StackProps, CfnOutput, Fn } from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import type { Construct } from "constructs";

export interface EdgeStackProps extends StackProps {
  /** Apex domain, e.g. usba.pk. www.<domain> is covered too. */
  domain: string;
}

/**
 * Lives in us-east-1 because CloudFront only accepts certificates from there.
 * The hosted zone's costs are covered once it is attached to the CloudFront
 * flat-rate plan (docs/deployment/aws.md).
 *
 * The certificate validates by DNS, so this stack waits until the domain's
 * nameservers at PKNIC point to the NameServers output below.
 */
export class EdgeStack extends Stack {
  readonly zone: route53.IHostedZone;
  readonly certificate: acm.ICertificate;

  constructor(scope: Construct, id: string, props: EdgeStackProps) {
    super(scope, id, props);
    const zone = new route53.PublicHostedZone(this, "Zone", { zoneName: props.domain });
    this.zone = zone;
    this.certificate = new acm.Certificate(this, "Certificate", {
      domainName: props.domain,
      subjectAlternativeNames: [`www.${props.domain}`],
      validation: acm.CertificateValidation.fromDns(zone),
    });
    new CfnOutput(this, "NameServers", {
      value: Fn.join(", ", zone.hostedZoneNameServers ?? []),
      description: "Set these as the domain's nameservers at PKNIC.",
    });
  }
}
