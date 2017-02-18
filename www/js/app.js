// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
var db = null;
angular.module('starter', ['ionic', 'ngCordova'])

.run(function ($ionicPlatform, $cordovaHealthKit, $cordovaSQLite) {
    $ionicPlatform.ready(function () {

        //create database if not exist
        if (window.cordova) {
          db = $cordovaSQLite.openDB({ name: "my.db" }); //device
         console.log("IOS");
        }else{
          db = window.openDatabase("my.db", '1', 'my', 1024 * 1024 * 100); // browser
          console.log("browser");

        }

        //db schema creation

        db.transaction(function (tx) {
            tx.executeSql('CREATE TABLE IF NOT EXISTS HeartRateData (timestamp, fullDateString, heartRate, stepCount, isResting)');
         
        }, function (error) {
            console.log('Cannot creatr table ERROR: ' + error.message);
        }, function () {
            console.log('created table OK');
        });

        db.transaction(function(tx) {
            tx.executeSql('CREATE TABLE IF NOT EXISTS heartRangeData (id integer, start_age integer, end_age integer, is_rest boolean, max_heart_rate integer, min_heart_rate integer, state_no integer)');
        }, function (error) {
            console.log('Cannot creatr table ERROR: ' + error.message);
        }, function () {
            console.log('created table OK');
        });

        db.transaction(function(tx) {
            var request = new XMLHttpRequest();
           request.open("GET", "../heart_data.json", false);
           request.send(null)
           var data = JSON.parse(request.responseText);
           for(var i=0;i<data.length;i++){
                tx.executeSql('INSERT INTO heartRangeData VALUES (?,?,?,?,?,?,?)', [data[i].id,data[i].start_age,data[i].end_age,data[i].is_rest,data[i].max_heart_rate,data[i].min_heart_rate,data[i].state_no]);
            }
        }, function (error) {
            alert('Cannot insert into heartRangeData ERROR: ' + error.message);
        }, function () {
            alert('inserted into table OK');
        });

        var query = "Select * from heartRangeData LIMIT 10";
        $cordovaSQLite.execute(db, query).then(function(res) {
          console.log(res);
        }, function (err) {
          console.error(err);
        });

        if (window.cordova && window.cordova.plugins.Keyboard) {
            // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
            // for form inputs)
            cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);

            // Don't remove this line unless you know what you are doing. It stops the viewport
            // from snapping when text inputs are focused. Ionic handles this internally for
            // a much nicer keyboard experience.
            cordova.plugins.Keyboard.disableScroll(true);
        }
        if (window.StatusBar) {
            StatusBar.styleDefault();
        }
        $cordovaHealthKit.isAvailable().then(function (yes) {
            // HK is available
            var permissions = ['HKQuantityTypeIdentifierHeight'];

            $cordovaHealthKit.requestAuthorization(
                permissions, // Read permission
                permissions // Write permission
            ).then(function (success) {
                // store that you have permissions
            }, function (err) {
                // handle error
            });

        }, function (no) {
            // No HK available
        });

    });
})
.controller('AppCtrl', function ($scope, $cordovaHealthKit, $cordovaSQLite) {

    // variable declaration
    $scope.body = {
        height: ''
    };

    $scope.heartData = "";
    var db;
    if (window.cordova) {
        db = $cordovaSQLite.openDB({ name: "my.db" }); //device
        console.log("IOS");
    } else {
        db = window.openDatabase("my.db", '1', 'my', 1024 * 1024 * 100); // browser
        console.log("browser");

    }

    function streamHeart() {
        //alert($scope.abc);
        
        var startDate;
        if (localStorage.getItem("startDate") == null || localStorage.getItem("startDate") == undefined) {
            startDate = 2 * 60 * 60 * 1000;
            localStorage.setItem("startDate", startDate);
        } else {
            startDate = localStorage.getItem("startDate");
            localStorage.setItem("startDate", new Date().getTime());

        }
        window.plugins.healthkit.querySampleType({
            'startDate': new Date(new Date().getTime() - startDate), // two days ago
            'endDate': new Date(), // now
            'sampleType': 'HKQuantityTypeIdentifierHeartRate',
            'unit': 'count/min' // make sure this is compatible with the sampleType
        },
            $scope.onSuccessHeartRate,
            $scope.onErrorHeartRate
        );
    }

   
    //private functions
    function InsertHeartData(timestamp,fullDate, heartRate, stepCount, isResting) {
        db.transaction(function (tx) {
            
            tx.executeSql('SELECT count(*) AS mycount FROM HeartRateData WHERE timestamp=' + timestamp, [], function (tx, rs) {
                //console.log('Record count (expected to be 2): ' + rs.rows.item(0).mycount);
                if (rs.rows.item(0).mycount == 0) {
                    tx.executeSql('INSERT INTO HeartRateData VALUES (?,?,?,?,?)',
                       [timestamp, fullDate, heartRate, stepCount, isResting]);
                }
                else {
                    console.log('already exists');
                    var query = "UPDATE HeartRateData SET heartRate = ? WHERE timestamp = ?";

                    tx.executeSql(query, [heartRate+1, timestamp],
                    function (tx, res) {
                        //console.log("insertId: " + res.insertId);
                        //c/onsole.log("rowsAffected: " + res.rowsAffected);
                    },
                    function (tx, error) {
                        //console.log('UPDATE error: ' + error.message);
                    });
                }
            }, function (tx, error) {
                console.log('SELECT error: ' + error.message);
            });
            

           

        }, function (error) {
            console.log('Transaction ERROR: ' + error.message);
        }, function () {
            console.log('Populated database OK');
        });
    }

    function parseHeartData(arrHeartData) {
        var len = arrHeartData.length;
        var relevantData = [];
        for (var i = 0; i < len; i++) {
            var tmp = arrHeartData[i];
            timeStamp = formatDateTime(tmp.startDate);
            var obj = {
                timeStamp: timeStamp.getTime(),
                fullDate: timeStamp.toString(),
                heartRate: tmp.quantity,
                sampleCount: 1
            }
            relevantData.push(obj);
        }
        return normalizeHeartRate(relevantData);
    }

    function normalizeHeartRate(data) {
        var len = data.length;
        var obj = {};
        var tmp;
        var stamp;
        for (var i = 0; i < len; i++) {
            tmp = data[i];
            stamp = tmp.timeStamp;
            if (obj[stamp] == null) {
                obj[stamp] = tmp;
            }
            else {
                var count = obj[stamp].sampleCount;
                var hRate = (count * obj[stamp].heartRate + tmp.heartRate) / (count + 1);
                obj[stamp].heartRate = hRate;
                obj[stamp].sampleCount = count + 1;
            }
        }
        var normalizedData = [];
        for (var key in obj) {
            normalizedData.push(obj[key]);
        }
        return normalizedData;
    }

    function formatDateTime(date) {
        var c = new Date(date);
        c.setSeconds(0);
        return c;
        //return c.getFullYear() + "-" + c.getMonth() + "-" + c.getDate() + "T" + c.getHours() + ":" + c.getMinutes() + ":0";

    }

    //scope functions
    $scope.getHeartRate = function () {
        setInterval(streamHeart, 2000);

    };

    $scope.onSuccessHeartRate = function (v) {
        var len = v.length;
        $scope.heartData = v;

        var heartDiv = document.getElementById("heartRate");

        heartDiv.innerHTML = JSON.stringify($scope.heartData);
    }

    $scope.onErrorHeartRate = function (v) {
        alert(v);
    }

    $scope.insertData = function () {
        var json = JSON.parse('[{"quantity":57,"endDate":"2017-02-18T12:00:02-05:00","startDate":"2017-02-18T12:00:02-05:00","UUID":"70C2BA2A-BCB7-4176-B64E-841741A7B670","sourceBundleld":"com.apple.health. 6AF1A533-9B21-44E0- A11D-8B330AF86FC8","sourceName":"Abhishek Apple Watch","metadata":{}},{"quantity":72,"endDate":"2017-02-18T12:00:09-05:00","startDate":"2017-02-18T12:00:09-05:00","UUID":"70C2BA2A-BCB7-4176-B64E-841741A7B670","sourceBundleld":"com.apple.health. 6AF1A533-9B21-44E0- A11D-8B330AF86FC8","sourceName":"Abhishek Apple Watch","metadata":{}},{"quantity":57,"endDate":"2017-02-18T12:00:055-05:00","startDate":"2017-02-18T12:00:55-05:00","UUID":"70C2BA2A-BCB7-4176-B64E-841741A7B670","sourceBundleld":"com.apple.health. 6AF1A533-9B21-44E0- A11D-8B330AF86FC8","sourceName":"Abhishek Apple Watch","metadata":{}},{"quantity":57,"endDate":"2017-02-18T12:01:22-05:00","startDate":"2017-02-18T12:02:22-05:00","UUID":"70C2BA2A -BCB7-4176-B64E-841741A7B670","sourceBundleld":"com.apple.health. 6AF1A533-9B21-44E0- A11D-8B330AF86FC8","sourceName":"Abhishek Apple Watch","metadata":{}}]');
        var x = parseHeartData(json);
        addData(x);
    }
    function addData(x) {
        for (var i = 0; i < x.length; i++) {
            var obj = x[i];
            InsertHeartData(obj.timeStamp, obj.fullDate, obj.heartRate, 0, 1);
        }
        getData();
    }

    function getData() {
        db.transaction(function (tx) {

            var query = "SELECT * FROM HeartRateData";

            tx.executeSql(query, [], function (tx, resultSet) {

                for (var x = 0; x < resultSet.rows.length; x++) {
                    console.log("Time stamp: " + resultSet.rows.item(x).timestamp + " :: Heart Rate " + resultSet.rows.item(x).heartRate);
                }
            },
            function (tx, error) {
                console.log('SELECT error: ' + error.message);
            });
        }, function (error) {
            console.log('transaction error: ' + error.message);
        }, function () {
            console.log('transaction ok');
        });
    }
});