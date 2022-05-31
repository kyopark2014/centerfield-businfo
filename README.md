# Centerfield Bus Station의 버스 도착 정보를 알림으로 받기

본 Github에서는 Amazon Severless를 이용하여 Centerfiled Bus Station의 "1100"번 버스에 대한 도착정보를 조회하여 알림의 형태로 슬랙으로 전달하는 모든 동작을 코드와 함께 설명합니다. AWS Serverless는 scalable하여 변화하는 트래픽을 잘 처리 할 수 있으며, 빠른 개발 및 유연한 유지보수 면에서 많은 장점을 가지고 있습니다.

전체적인 Architecture는 아래와 같습니다. Serverless인 Amazon API Gateway, Lambda, SNS, DynamoDB로 구성되며, 인프라는 IaC인 AWS CDK를 통해 구현됩니다. 또한, 로그분석은 Amazon CloudWatch를 이용합니다.  

<img width="754" alt="image" src="https://user-images.githubusercontent.com/52392004/162966207-e55d204c-4cee-44bc-8202-30a7be7c8008.png">

사용 시나리오는 아래와 같습니다.

1) 사용자는 Web이나 Android/iOS App에서 제공되는 Restful API를 통해 원하는 버스의 도착 정보를 요청합니다. 

2) API Gateway는 사용자의 요청을 받는 Endpoint로서, 보안을 위해 HTTPS 사용하고, Amazon Lambda로 event를 전달합니다. 

3) Amazon Lambda는 경기버스에 제공하는 API를 활용하여 해당 버스의 도착 정보를 열람합니다. 

4) 확인된 버스의 정보는 추후 사용을 위해 DynamoDB에 저장합니다. 

5) Amazon Lambda는 사용자에게 alarm을 보내기 위하여, Amazon SNS로 메시지를 전송합니다. 

6) Amazon SNS는 미리 Subscribe된 Lambda for slack을 트리거합니다. 

7) Lambda for slack은 slack으로 메시지 전송을 요청합니다. 

## Specific Operation 

[Centerfield 버스 도착 정보 조회](https://github.com/kyopark2014/centerfield-businfo/blob/main/businfo-openapi.md)에서 경기버스 1100이 센터필드 정류장을 지나갈때 도착 예정시간이나 버스에 대한 정보를 조회 할 수 있습니다. 

해당 API는 아래와 같습니다. 

http://openapi.gbis.go.kr/ws/rest/busarrivalservice?serviceKey=1234567890&stationId=122000202&routeId=222000074&staOrder=81

센터필드 정류장: stationId=122000202

검색하려는 노선 경로: routeID=222000074

해당 노선에서 센터필드 정류장의 순번: staOrder=81


상기 API를 통해 확인된 정보는 아래와 같습니다. "경기74아3257" 버스가 12분후에 도착예정이며, 현재 43개의 좌석이 비어 있습니다.

![image](https://user-images.githubusercontent.com/52392004/162734910-16d8b31f-3ffd-428d-85d4-ce63a818c040.png)

## 인프라 구성

여기서는 AWS CDK를 이용하여 인프라를 쉽게 생성하고 삭제할 수 있습니다. [Cloud Development Kit (CDK) 구성](https://github.com/kyopark2014/centerfield-businfo/blob/main/cdk/README.md)을 참조하여, 필요한 AWS 서비스를 추가하거나 삭제합니다. 

#### 인프라 설치 방법

```c
$ cdk synth
$ cdk deploy
````
#### 인프라 삭제 방법

```c
$ cdk destroy
```

## Lambda 함수의 구현 


#### Lambda for getLocation

Lambda for getLocation은 OpenaAPI를 이용하여 버스의 도착정보를 조회하고, DynamoDB에 저장하며, 조회한 결과를 Amazon SNS에 publish 하는 역할을 합니다. 

https://github.com/kyopark2014/centerfield-businfo/tree/main/cdk/repositories/lambda-for-getLocation

#### Lambda for slack

Lambda for slack은 Amazon SNS을 subscribe하고 있다가, Lambda for getLocation에서 전달한 메시지를 Slack에 전달합니다. 

https://github.com/kyopark2014/centerfield-businfo/tree/main/cdk/repositories/lambda-for-slack

## 테스트 방법 및 결과

postman을 이용하여 아래와 같이 테스트 가능 합니다. 여기서 Method로 "GET"을 선택하고, URL은 api-gateway의 endpoint를 아래와 같이 입력합니다. 센터필드 정류장에서 1100 버스에 대한 정보를 베이스로 아래와 같이 Body에 입력합니다. 

```java
{
    "stationId": "122000202",
    "routeId": "222000074",
    "staOrder": "81",
    "routeNumber": "1100"
}
```

이때 headers는 아래와 같이 "Content-Type"으로 "application/json"을 설정합니다. 

![image](https://user-images.githubusercontent.com/52392004/162951310-07a69ae2-798f-469f-8c87-6cea1b1dbe9e.png)


실행한 결과는 아래와 같습니다. 여기서 "statusCode": 200이며, body에는 해당 버스에 대한 정보가 전달됩니다. 

![image](https://user-images.githubusercontent.com/52392004/162950933-49d43bda-d688-4736-84c9-4dde255292f0.png)


또한, 검색결과는 dynamodb에도 저장되는데, 아래와 같이 저장되는 것을 console에서 확인 할 수 있습니다. 
<img width="950" alt="image" src="https://user-images.githubusercontent.com/52392004/162950746-b39776da-9ae5-4015-ac3c-96b453c78d86.png">


정상적으로 버스 도착 정보가 조회가 되면, Slack을 통해 아래와 같이 알림을 받을 수 있습니다. 

![image](https://user-images.githubusercontent.com/52392004/162968091-ac5d7ef9-0141-44e7-99a5-9f4fef70ee05.png)
