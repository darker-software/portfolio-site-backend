const { Stack } = require('aws-cdk-lib');
const lambda = require('aws-cdk-lib/aws-lambda');
const apigateway = require('aws-cdk-lib/aws-apigateway');
const iam = require('aws-cdk-lib/aws-iam');
const { Tracing } = require("aws-cdk-lib/aws-lambda");

class PortfolioSiteV2Stack extends Stack {
  /**
   *
   * @param {Construct} scope
   * @param {string} id
   * @param {StackProps=} props
   */
  constructor(scope, id, props) {
    super(scope, id, props);

    // Create the Lambda Layer
    const lambdaLayer = new lambda.LayerVersion(this, "PortfolioSiteLayer", {
      code: lambda.Code.fromAsset("lambda-layer"),
      compatibleRuntimes: [lambda.Runtime.NODEJS_LATEST, lambda.Runtime.NODEJS_20_X],
      description: "The layer for common dependencies in portfolio site lambdas",
    });

    // IAM Role for Lambda to use SES
    const sesPolicy = new iam.PolicyStatement({
      actions: ["ses:SendEmail", "ses:SendRawEmail"],
      resources: ["*"],
    });

    // Lambda Function for captcha authorizer
    const captchaAuthorizerFunction = new lambda.Function(
      this,
      "CaptchaAuthorizerFunction",
      {
        functionName: "CaptchaAuthorizerFunction",
        runtime: lambda.Runtime.NODEJS_LATEST,
        handler: "function.handler",
        code: lambda.Code.fromAsset("lambda/captcha-verify"),
        tracing: Tracing.ACTIVE,
        environment: {
          CAPTCHA_SECRET: process.env.HCAPTCHA_SECRET,
        },
        layers: [lambdaLayer],
      }
    );

    // Lambda Function for sending emails
    const emailFunction = new lambda.Function(this, "SendEmailFunction", {
      functionName: "SendEmailFunction",
      runtime: lambda.Runtime.NODEJS_LATEST,
      handler: "function.handler",
      code: lambda.Code.fromAsset("lambda/send-email"),
      tracing: Tracing.ACTIVE,
      environment: {
        CONTACT_EMAIL_TO: process.env.CONTACT_EMAIL_TO,
        CONTACT_EMAIL_FROM: process.env.CONTACT_EMAIL_FROM,
      },
      layers: [lambdaLayer],
    });

    emailFunction.addToRolePolicy(sesPolicy);

    // API Gateway with a custom authorizer
    const api = new apigateway.RestApi(this, "PortfolioSiteV2", {
      restApiName: "Portfolio Site V2",
      description: "This service processes requests for the portfolio site.",
      deployOptions: {
        tracingEnabled: true,
      },
    });

    const authorizer = new apigateway.RequestAuthorizer(
      this,
      "CaptchaAuthorizer",
      {
        handler: captchaAuthorizerFunction,
        identitySources: [apigateway.IdentitySource.header("Authorization")],
      }
    );

    const email = api.root.addResource("sendEmail");
    email.addMethod("POST", new apigateway.LambdaIntegration(emailFunction), {
      authorizer: authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });
  }
}

module.exports = { PortfolioSiteV2Stack }
