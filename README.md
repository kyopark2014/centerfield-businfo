# Centerfield Bus Station의 버스 도착 정보를 알림으로 받기

여기서는 Amazon Lambda을 통해 경기버스에서 제공하는 OpenAPI로 Centerfiled의 Bus Station에 1100 버스가 도착하는 정보를 슬랙으로 알림을 받는 방법에 대해 설명하고자 합니다. 

전체적인 Architecture는 아래와 같습니다.

<img width="753" alt="image" src="https://user-images.githubusercontent.com/52392004/162922023-392a807f-2831-4821-84ba-8a9f3acd8a6b.png">

사용 시나리오는 아래와 같습니다.

1) 사용자는 Web이나 Android/iOS App에서 제공되는 Restful API를 통해 원하는 버스의 도착 정보를 요청합니다. 

2) API Gateway는 사용자의 요청을 받는 Endpoint로서 SSL을 이용한 보안을 지원하고 Amazon Lambda에서 event를 전달합니다. 

3) Amazon Lambda는 경기버스에 제공하는 API를 활용하여 해당 버스의 도착 정보를 열람합니다. 

4) 확인된 버스의 정보는 추후 사용을 위해 DynamoDB에 저장합니다. 

5) Amazon Lambda는 사용자에게 alarm을 보내기 위하여, Amazon SNS로 메시지를 전송합니다. 

6) Amazon SNS는 미리 Subscribe된 Lambda for slack을 트리거합니다. 

7) Lambda for slack은 slack으로 메시지 전송을 요청합니다. 

## 문제 요약

[Centerfield 버스 도착 정보 조회](https://github.com/kyopark2014/centerfield-businfo/blob/main/businfo-openapi.md)에서 경기버스 1100이 센터필드 정류장을 지나갈때 도착 예정시간이나 버스에 대한 정보를 조회 할 수 있습니다. 

해당 API는 아래와 같습니다. 

http://openapi.gbis.go.kr/ws/rest/busarrivalservice?serviceKey=1234567890&stationId=122000202&routeId=222000074&staOrder=81

센터필드 정류장: stationId=122000202

검색하려는 노선 경로: routeId: routeID=222000074

해당 노선에서 센터필드 정류장의 순번: staOrder=81


상기 API를 통해 확인된 정보는 아래와 같습니다. "경기74아3257" 버스가 12분후에 도착예정이며, 현재 43개의 좌석이 비어 있습니다.

![image](https://user-images.githubusercontent.com/52392004/162734910-16d8b31f-3ffd-428d-85d4-ce63a818c040.png)

