
# Centerfield 버스 도착 정보 조회

## 경기버스 API

센터필드 정류장에 대한 버스정보를 읽어오기 위하여 아래와 같이 경비버스에서 제공하는 API를 사용합니다. 여기서는 버스 도착 예정시간과 해당 버스에 대한 정보를 조회하기 위하여 정류장 ID(stationId), 노선 ID(routeId), 센터필드 정류장의 순번(staOrder)이 필요합니다. 


### 버스 도착 예정시간의 확인 

경기버스에서 제공하는 버스 도착 정보는 아래와 같이 조회할 수 있습니다. 

http://openapi.gbis.go.kr/ws/rest/busarrivalservice?serviceKey=1234567890&stationId=122000202&routeId=222000074&staOrder=81

- 센터필드 정류장: stationId=122000202
- 검색하려는 노선 경로: routeId=222000074
- 해당 노선에서 센터필드 정류장의 순번: staOrder: 81

상기 API를 통해 확인된 정보는 아래와 같습니다. "경기74아3257" 버스가 12분후에 도착예정이며, 현재 43개의 좌석이 비어 있습니다. 

![image](https://user-images.githubusercontent.com/52392004/162734910-16d8b31f-3ffd-428d-85d4-ce63a818c040.png)


### 정류장 ID 확인 

[경기버스정보](http://www.gbis.go.kr/gbis2014/publicService.action?cmd=mBusArrivalStation)에서 버스에 대한 정보를 조회 할 수 있습니다.

센터필드 정류장에 대한 조회 동작은 아래와 같습니다. 

http://openapi.gbis.go.kr/ws/rest/busstationservice?serviceKey=1234567890&keyword=%EC%84%BC%ED%84%B0%ED%95%84%EB%93%9C

![image](https://user-images.githubusercontent.com/52392004/162731065-7540a7f3-2f67-46e2-bd85-6b154c31c72d.png)

여기서 stationID에 대한 정보는 122000202임을 알 수 있습니다. 

![image](https://user-images.githubusercontent.com/52392004/162731202-df75f3ec-aa99-4d82-ac2e-e42fcf86a86b.png)


### 버스 번호로 노선 정보 확인

[버스 번호로 노선 정보 확인](http://www.gbis.go.kr/gbis2014/publicService.action?cmd=mBusRoute)을 하기 위한 API는 아래와 같습니다. 여기서 1100에 대한 노선 정보는 아래와 같이 확인 가능합니다. 

http://openapi.gbis.go.kr/ws/rest/busrouteservice?serviceKey=1234567890&keyword=1100

![image](https://user-images.githubusercontent.com/52392004/162917745-bb108b42-0abb-49ee-8ddc-205c6afa21d8.png)

여기서, 센터필드를 지나가는 1100 버스의 routeID는 222000074 입니다.


### 버스 도착 정보의 확인 

센터필드역에 대한 버스 도착정보는 아래와 같이 확인이 가능합니다. 

http://openapi.gbis.go.kr/ws/rest/busarrivalservice/station?serviceKey=1234567890&stationId=122000202

![image](https://user-images.githubusercontent.com/52392004/162731386-b14e976f-457d-4743-a895-c275b882725c.png)

이때의 table에 대한 정보는 아래와 같습니다. routeId 222000074인 버스 "경기74아3249"가 예상도착시간(predictTime)이 7분이며, 현재 43개의 남은 좌석의 수가(remainSeatCnt)임을 알 수 있습니다. 또한, 여기서 routeId 222000074에서 센터필드 정류장의 순번(staOrder)는 81임을 알수 있습니다.

![image](https://user-images.githubusercontent.com/52392004/162731466-f5a09ff9-bb7b-447d-ab6d-34f918214a44.png)


### 버스 번호 확인

routeId 222000074에 대한 버스 번호는 아래 API로 확인합니다. 

[버스노선항목조회](http://www.gbis.go.kr/gbis2014/publicService.action?cmd=mBusRouteInfo)에 따라 routeID가 222000074에 대해 버스번호를 확인합니다.

http://openapi.gbis.go.kr/ws/rest/busrouteservice/info?serviceKey=1234567890&routeId=222000074

![image](https://user-images.githubusercontent.com/52392004/162732645-d93c1f5d-dc1b-4ef6-9c93-6a483cd8fdda.png)

여기에서 버스번호(routeName)은 1100번 임을 확인할 수 있습니다. 

![image](https://user-images.githubusercontent.com/52392004/162732910-1f44e6b4-f3c1-4bb8-9df1-cde23c2c4da1.png)
