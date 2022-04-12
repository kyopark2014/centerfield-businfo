# Centerfield Bus Station의 버스 도착 정보를 알림으로 받기

여기서는 Amazon Lambda을 통해 경기버스에서 제공하는 OpenAPI로 Centerfiled의 Bus Station에 1100 버스가 도착하는 정보를 슬랙으로 알림을 받는 방법에 대해 설명하고자 합니다. 

## 문제 요약

[Centerfield 버스 도착 정보 조회](https://github.com/kyopark2014/centerfield-businfo/blob/main/businfo-openapi.md)에서 경기버스 1100이 센터필드 정류장을 지나갈때 도착 예정시간이나 버스에 대한 정보를 조회 할 수 있습니다. 

해당 API는 아래와 같습니다. 

http://openapi.gbis.go.kr/ws/rest/busarrivalservice?serviceKey=1234567890&stationId=122000202&routeId=222000074&staOrder=81

센터필드 정류장: stationId=122000202

검색하려는 노선 경로: routeId: routeID=222000074

해당 노선에서 센터필드 정류장의 순번: staOrder=81


상기 API를 통해 확인된 정보는 아래와 같습니다. "경기74아3257" 버스가 12분후에 도착예정이며, 현재 43개의 좌석이 비어 있습니다.

![image](https://user-images.githubusercontent.com/52392004/162734910-16d8b31f-3ffd-428d-85d4-ce63a818c040.png)

