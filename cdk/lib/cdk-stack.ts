import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';

import {SnsEventSource} from "aws-cdk-lib/aws-lambda-event-sources";
import * as sns from "aws-cdk-lib/aws-sns";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apiGateway from "aws-cdk-lib/aws-apigateway";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs"; 

const stage = "dev";

export class CdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // SNS
    const topic = new sns.Topic(this, 'sns-centerfield', {
      topicName: 'sns-centerfield'
    });

    // DynamoDB
    let tableName = 'Centerfield-BusInfo';
    const dataTable = new dynamodb.Table(this, 'Centerfield-BusInfo', {
      tableName: tableName,
      partitionKey: { name: 'RouteNumber', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'Timestamp', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Lambda - getLocation
    const lambdaGetLocation = new lambda.Function(this, "lambdaGetLocation", {
      runtime: lambda.Runtime.NODEJS_14_X, 
      code: lambda.Code.fromAsset("repositories/lambda-for-getLocation"), 
      handler: "index.handler", 
      timeout: cdk.Duration.seconds(10),
      environment: {
        topicArn: topic.topicArn,
        tableName: tableName
      }
    });  
    // grent permission
    dataTable.grantReadWriteData(lambdaGetLocation);
    topic.grantPublish(lambdaGetLocation);
    new cdk.CfnOutput(this, 'lambda-arn', {
      value: lambdaGetLocation.functionArn,
      description: 'The url of lambda function arn',
    }); 

    // Lambda - Slack
    const lambdaSlack = new lambda.Function(this, "LambdaSlack", {
      runtime: lambda.Runtime.NODEJS_14_X, 
      code: lambda.Code.fromAsset("repositories/lambda-for-slack"), 
      handler: "index.handler", 
      timeout: cdk.Duration.seconds(10),
      environment: {
        token: "xoxb-manually-updated"
      }
    });    
    lambdaSlack.addEventSource(new SnsEventSource(topic)); 

    // api Gateway
    const logGroup = new logs.LogGroup(this, 'AccessLogs', {
      retention: 90, // Keep logs for 90 days
    });
    logGroup.grantWrite(new iam.ServicePrincipal('apigateway.amazonaws.com')); 

    const api = new apiGateway.RestApi(this, 'api-centerfield', {
      description: 'api-centerfield',
      endpointTypes: [apiGateway.EndpointType.REGIONAL],
      binaryMediaTypes: ['*/*'], 
      deployOptions: {
        stageName: stage,
        accessLogDestination: new apiGateway.LogGroupLogDestination(logGroup),
        accessLogFormat: apiGateway.AccessLogFormat.jsonWithStandardFields({
          caller: false,
          httpMethod: true,
          ip: true,
          protocol: true,
          requestTime: true,
          resourcePath: true,
          responseLength: true,
          status: true,
          user: true
        }),
      },
    });   

    lambdaGetLocation.grantInvoke(new iam.ServicePrincipal('apigateway.amazonaws.com'));
    
    const templateString: string = `##  See http://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-mapping-template-reference.html
    ##  This template will pass through all parameters including path, querystring, header, stage variables, and context through to the integration endpoint via the body/payload
    #set($allParams = $input.params())
    {
    "body-json" : $input.json('$'),
    "params" : {
    #foreach($type in $allParams.keySet())
        #set($params = $allParams.get($type))
    "$type" : {
        #foreach($paramName in $params.keySet())
        "$paramName" : "$util.escapeJavaScript($params.get($paramName))"
            #if($foreach.hasNext),#end
        #end
    }
        #if($foreach.hasNext),#end
    #end
    },
    "stage-variables" : {
    #foreach($key in $stageVariables.keySet())
    "$key" : "$util.escapeJavaScript($stageVariables.get($key))"
        #if($foreach.hasNext),#end
    #end
    },
    "context" : {
        "account-id" : "$context.identity.accountId",
        "api-id" : "$context.apiId",
        "api-key" : "$context.identity.apiKey",
        "authorizer-principal-id" : "$context.authorizer.principalId",
        "caller" : "$context.identity.caller",
        "cognito-authentication-provider" : "$context.identity.cognitoAuthenticationProvider",
        "cognito-authentication-type" : "$context.identity.cognitoAuthenticationType",
        "cognito-identity-id" : "$context.identity.cognitoIdentityId",
        "cognito-identity-pool-id" : "$context.identity.cognitoIdentityPoolId",
        "http-method" : "$context.httpMethod",
        "stage" : "$context.stage",
        "source-ip" : "$context.identity.sourceIp",
        "user" : "$context.identity.user",
        "user-agent" : "$context.identity.userAgent",
        "user-arn" : "$context.identity.userArn",
        "request-id" : "$context.requestId",
        "resource-id" : "$context.resourceId",
        "resource-path" : "$context.resourcePath"
        }
    }`
    const requestTemplates = { // path through
      "application/json" : templateString
    }

    // Lambda Invoke Role
    const invokeRole = new iam.Role(this, 'LambdaInvokeRole', {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      description: 'Role to invoke lambda',
    });
    invokeRole.assumeRolePolicy?.addStatements(
      new iam.PolicyStatement({
        actions: ['sts:AssumeRole'],
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal('lambda.amazonaws.com')]
      })
    )
    invokeRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "lambda:InvokeFunction", 
        "lambda:GetFunctionConfiguration", 
        "logs:*"
      ],
      resources: [lambdaGetLocation.functionArn],
    })); 
    new cdk.CfnOutput(this, 'InvokeRoleArn', {
      value: invokeRole.roleArn,
      description: 'The arn of invoke role',
    });    

    // define getLocation api
    const getLocation = api.root.addResource('getLocation');
    getLocation.addMethod('GET', new apiGateway.LambdaIntegration(lambdaGetLocation, {
      passthroughBehavior: apiGateway.PassthroughBehavior.WHEN_NO_TEMPLATES,
      requestTemplates: requestTemplates,
      credentialsRole: invokeRole,
      integrationResponses: [{
        statusCode: '200',
      }], 
      proxy:false, 
    }), {
      methodResponses: [   // API Gateway sends to the client that called a method.
        {
          statusCode: '200',
          responseModels: {
            'application/json': apiGateway.Model.EMPTY_MODEL,
          }, 
        }
      ]
    }); 

    new cdk.CfnOutput(this, 'apiUrl', {
      value: api.url,
      description: 'The url of API Gateway',
    });    
  }
}
