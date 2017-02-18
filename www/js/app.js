// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'

angular.module('starter', ['ionic', 'ngCordova'])

.run(function ($ionicPlatform, $cordovaHealthKit, $cordovaSQLite) {
    $ionicPlatform.ready(function () {

        //create database if not exist
        var db = $cordovaSQLite.openDB({ name: "my.heartDb" });

        //db schema creation

        db.transaction(function (tx) {
            tx.executeSql('CREATE TABLE IF NOT EXISTS HeartRateData (timestamp, heartRate, stepCount, isResting)');
         
        }, function (error) {
            alert('Cannot creatr table ERROR: ' + error.message);
        }, function () {
            console.log('created table OK');
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
    var db = $cordovaSQLite.openDB({ name: "my.heartDb" });

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
    function InsertHeartData(timestamp, heartRate, stepCount, isResting) {
        db.transaction(function (tx) {
             tx.executeSql('INSERT INTO HeartRateData VALUES (?,?,?,?)', [timestamp, heartRate, stepCount, isResting]);

        }, function (error) {
            console.log('Transaction ERROR: ' + error.message);
        }, function () {
            console.log('Populated database OK');
        });
    }

    function parseHeartData() {

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




});