# Cloud Development Kit (CDK) 구성

IaC(Infrastructure as Code)툴인 Amazon CDK를 이용하여 인프라를 설치하고 삭제할 수 있습니다. 여기서는 CDK V2를 기준으로 typescript를 이용합니다.

구현순서는 먼저 Amazon SNS, DynamoDB를 정의하고, 두개의 Lambda를 구성하며, 마지막으로 Amazon API Gateway를 구현하게 됩니다. 

Amazon SNS은 아래와 같이 "sns-centerfield"라는 이름으로 topic을 구성합니다. 
```java
    const topic = new sns.Topic(this, 'sns-centerfield', {
      topicName: 'sns-centerfield'
    });
```

DynamoDB는 "Centerfiedl-BusInfo"라는 이름으로 생성하며, partition key로 버스번호(RouteNumber), short key로 생성시간(Timestamp)를 지정합니다. 

```java
  let tableName = 'Centerfield-BusInfo';
    const dataTable = new dynamodb.Table(this, 'Centerfield-BusInfo', {
      tableName: tableName,
      partitionKey: { name: 'RouteNumber', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'Timestamp', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
```

Lambda for getLocation을 아래와 같이 정의 합니다. Lambda에서 Amazon SNS로 publish를 하기 위하여 environment에 topicArn을 저장하고, DynamoDB에 저장하기 위해 tableName도 전달합니다. 또한, DynamoDB에 대한 읽기/쓰기를 SNS에 대한 publish 권한을 줍니다. 

```java
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
    dataTable.grantReadWriteData(lambdaGetLocation);
    topic.grantPublish(lambdaGetLocation);
```

Lambda for slack을 아래와 같이 구현합니다. slack API를 호출하기 위해서는 token을 전달하여야 하는데, 코드에 token이 포함되면 안되므로 아래와 같이 dummy값으로 초기 생성합니다. 이후 console에서 해당 lambda의 environment에 접속하여 slack에서 얻은 token 번호를 입력합니다. [slack에서 token 생성](https://github.com/kyopark2014/serverless-storytime/blob/main/docs/slackapp.md)은 slack에서 직접 수행하여야 합니다. 또한, Lambda for slack과 Amazon SNS 연결은 "addEventSource"를 이용해 아래처럼 수행합니다. 

```java
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
```

API Gateway는 아래와 같이 설정할 수 있습니다. 

```java
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
      proxy: false
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

    const getLocation = api.root.addResource('getLocation');
    getLocation.addMethod('GET', new apiGateway.LambdaIntegration(lambdaGetLocation, {
      PassthroughBehavior: apiGateway.PassthroughBehavior.WHEN_NO_TEMPLATES,
      requestTemplates: requestTemplates,
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
```
