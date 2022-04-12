const aws = require('aws-sdk');
const sns = new aws.SNS();

const tableName = "CenterfieldBusLocationInfo";
const dynamo = new aws.DynamoDB.DocumentClient();

const topicArn = process.env.topicArn;

exports.handler = async (event, context) => {
    console.log('## ENVIRONMENT VARIABLES: ' + JSON.stringify(process.env))
    console.log('## EVENT: ' + JSON.stringify(event))    
    
    const body = Buffer.from(event["body-json"], "base64");
    const userReq = JSON.parse(body);

    const stationId = userReq['stationId'];
    const routeId =  userReq['routeId'];
    const staOrder = userReq['staOrder'];
    const routeNumber = userReq['routeNumber'];
    
    const date = new Date();        
    let timestamp = Math.floor(date.getTime()/1000).toString();

	const options = { 
        uri: 'http://openapi.gbis.go.kr/ws/rest/busarrivalservice', 
        method: 'GET',
        qs:{ 
            serviceKey: '1234567890', // default
            stationId: stationId,
            routeId: routeId,
            staOrder: staOrder
        },
    };
    
    makeRequest(options, function(responseCode,json){
        if(responseCode==200) {
            var res = JSON.parse(json);
            console.log('json: '+JSON.stringify(res.response));

            if(res.response.msgHeader.resultCode._text == '0') { // Success
                predictTime = res.response.msgBody.busArrivalItem.predictTime1._text;
                plateNo = res.response.msgBody.busArrivalItem.plateNo1._text;
                remainSeatCnt =  res.response.msgBody.busArrivalItem.remainSeatCnt1._text;

                console.log('No: '+plateNo+', predictTime: '+predictTime+', remainSeatCnt: '+remainSeatCnt);

                message = predictTime+'분후에 '+routeNumber+'번 버스('+plateNo+') 버스가 도착할 예정입니다. '+' 현재 '+remainSeatCnt+'개의 빈좌석이 남아 있습니다.'; 

                // putItem to DynamoDB
                var putParams = {
                    TableName: tableName,
                    Item: {
                        Timestamp: timestamp,
                        RouteNumber: routeNumber,
                        RouteId: routeId,
                        PlateNo: plateNo,
                        PredictTime: predictTime,
                        RemainSeatCnt: remainSeatCnt    
                    } 
                };

                dynamo.put(putParams, function(err){
                    if (err) {
                        console.log('Failure: '+err);
                    } 
                });
            }
            else { // Success but no bus
                statusCode = '404';
                console.log(statusCode+': '+res.response.msgHeader.resultMessage._text);

                message = '현재 가능한 버스노선이 확인되지 않고 있습니다. 잠시후에 다시 시도해주시기 바랍니다.';; 
            }

            // publish
            var snsParams = {
                Subject: 'Bus 도착정보',
                Message: message,        
                TopicArn: topicArn
            }; 
            console.log('snsParams: '+JSON.stringify(snsParams));
            
            snsResult = sns.publish(snsParams);
            console.log('snsResult:', snsResult);

            isCompleted = true;
        }
        else { // Failure to request
            statusCode = responseCode;
            console.log(statusCode+': '+responseCode);

            isCompleted = true;
        }
    });

    // for return info
    const arrivalInfo = {
        Timestamp: timestamp,
        RouteNumber: routeNumber,
        RouteId: routeId,
        PlateNo: plateNo,
        PredictTime: predictTime,
        RemainSeatCnt: remainSeatCnt    
    }; 
    console.log('file info: ' + JSON.stringify(arrivalInfo)) 

    const response = {
        statusCode: 200,
        body: JSON.stringify(arrivalInfo)
    };
    return response;
};