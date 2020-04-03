const aws = require("aws-sdk");
var ddb = new aws.DynamoDB({ apiVersion: "2012-08-10" });
var ses = new aws.SES();
aws.config.update({ region: "us-east-1" });
var docClient = new aws.DynamoDB.DocumentClient();
exports.emailService = function (event, context, callback) {
    let message = event.Records[0].Sns.Message;
    let messageJson = JSON.parse(message);
    let messageDataJson = JSON.parse(messageJson.data);
    console.log("Test Message: " + messageJson.data);
    console.log("Test Link: " + messageDataJson.link);
    console.log("Test Email: " + messageDataJson.Email);
    console.log("Domain: " + process.env.DOMAIN_NAME);
    let currentTime = new Date().getTime();
    var time = process.env.ttl;
    let ttl = time * 60 * 1000;
    let expirationTime = (currentTime + ttl);
    var time = process.env.ttl;
    //console.log(typeof process.env.ttl);
    var integer = parseInt(time);    // NaN (Not a Number)
    
    var emailParams = {
        Destination: {
            /* required */
            ToAddresses: [
                messageDataJson.Email
                /* more items */
            ]
        },
        Message: {
            /* required */
            Body: {
                Text: {
                    Charset: "UTF-8",
                    Data: JSON.stringify(messageDataJson.link)
                }
            },
            Subject: {
                Charset: "UTF-8",
                Data: "Bill Link"
            }
        },
        Source: "csye6225@" + process.env.DOMAIN_NAME /* required */
    };
    let putParams = {
        TableName: "csye-6225",
        Item: {
             'Id': { S: messageDataJson.Email },
            'Email': { S: messageDataJson.Email },
            'resetlink': { S: messageDataJson.link.toString() },
            'ttl': { N: expirationTime.toString() }
        }
    };
    let queryParams = {
        TableName: 'csye-6225',
        Key: {
            'Id': { S: messageDataJson.Email },
        },
    };
    // first get item and check if email exists
    //if does not exist put item and send email,
    //if exists check if ttl > currentTime,
    // if ttl is greater than current time do nothing,
    // else send email
    ddb.getItem(queryParams, (err, data) => {
        if (err) console.log("hii get",err)
        else {
            // console.log('getItemttl: '+JSON.stringify(data, null, 2));
            let jsonData = JSON.stringify(data)
            let parsedJson = JSON.parse(jsonData);
            if (data.Item == null) {
                console.log("null");
                ddb.putItem(putParams, (err, data) => {
                    if (err) console.log(err);
                    else {
                        console.log(data);
                        console.log("hi");
                        console.log('sent from 1st function')
                        var sendPromise = ses.sendEmail(emailParams).promise();
                        sendPromise
                            .then(function (data) {
                                console.log(data.MessageId);
                            })
                            .catch(function (err) {
                                console.error(err, err.stack);
                            });
                    }
                });
            } else {
                console.log("not null");
                let curr = new Date().getTime();
                let ttl = Number(parsedJson.Item.ttl.N);
                console.log(typeof curr + ' ' + curr);
                console.log(typeof ttl + ' ' + ttl);
                if (curr > ttl) {
                    console.log("not null 1");
                    ddb.putItem(putParams, (err, data) => {
                        if (err) console.log("hii 2",err)
                        else {
                            console.log("hello");
                            console.log(data);
                            console.log('sent from 1st function')
                            var sendPromise = ses.sendEmail(emailParams).promise();
                            sendPromise
                                .then(function (data) {
                                    console.log(data.MessageId);
                                })
                                .catch(function (err) {
                                    console.error(err, err.stack);
                                });
                        }
                    });
                } else {
                    console.log("not nulls");

                }
            }
        }
    });
};