// Ionic Starter App

var globals = {
    files: []
};

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
angular.module('starter', ['ionic'])

.run(function($ionicPlatform) {
    $ionicPlatform.ready(function() {
        // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
        // for form inputs)
        if (window.cordova && window.cordova.plugins.Keyboard) {
            cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
        }
        if (window.StatusBar) {
            StatusBar.styleDefault();
        }
    });
})
.controller('MainController', [ '$scope', '$state', '$q', '$ionicModal', '$ionicLoading', '$timeout', function($scope, $state, $q, $ionicModal, $ionicLoading, $timeout) {

    $scope.photos = localStorage.album ? JSON.parse(localStorage.album) : [];

    globals.client = new Dropbox.Client({
        key: "feye6tfc5en2kww"
    });

    globals.client.authenticate(function(error, client) {
        if (error)
        {
            console.log(error);
            return;
        }

        console.log("DropBox API is ready to go, retrieving account info...");

        client.getAccountInfo(function(error, accountInfo) {
            if (error)
            {
                console.log(error);
                return;
            }

            $timeout(function() {
                $scope.connected = accountInfo.name;
            });

            console.log(accountInfo);
        });
    });

    $scope.rand = function(min, max) {
        return Math.floor(Math.random() * (max - min)) + min;
    }

    $scope.guid = function() {
        var d = new Date().getTime();

        var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = (d + Math.random()*16)%16 | 0;
            d = Math.floor(d/16);
            return (c=='x' ? r : (r&0x3|0x8)).toString(16);
        });

        return uuid;
    }

    $scope.generateThumbnail = function(url, outputDim, callback) {
        var c = document.createElement('canvas');

        var res = {
        };

        var img = new Image();
        img.onload = function() {
            console.log(img.width+"x"+img.height);

            if (!res.width)
            {
                res.width = img.width;
                res.height = img.height;
            }

            var dim = Math.floor( Math.min(img.width/2, img.height/2) );

            // now generate a square thumbnail by repeatedly scaling down by a factor of 2

            if (dim <= outputDim)
            {
                dim = outputDim;
            }

            c.width = dim;
            c.height = dim;

            var ctx = c.getContext("2d");
            ctx.imageSmoothEnabled = true;

            if (img.width == img.height)
            {
                ctx.drawImage(img, 0, 0, dim, dim);
            } else
            {
                var min = Math.min(img.width, img.height);

                if (img.width > img.height)
                {
                    ctx.drawImage(img, (img.width - min) / 2, 0, min, min, 0, 0, dim, dim);
                } else
                {
                    ctx.drawImage(img, 0, (img.height - min) / 2, min, min, 0, 0, dim, dim);
                }
            }

            if (dim > outputDim)
            {   // scale down again - this needs tuning
                img.src = c.toDataURL();
            } else
            {   // we are done
                console.log(dim+"x"+dim);

                res.url = c.toDataURL('image/jpeg', 85);

                callback(res);
            }
        }
        img.onerror = function() {
            console.log("image load error: "+url);
        }

        // TODO handle errors
        img.src = url;
    }

    $scope.dataURItoBlob = function(dataURI) {
        // convert base64 to raw binary data held in a string
        // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
        var byteString = atob(dataURI.split(',')[1]);

        // separate out the mime component
        var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]

        // write the bytes of the string to an ArrayBuffer
        var ab = new ArrayBuffer(byteString.length);
        var ia = new Uint8Array(ab);
        for (var i = 0; i < byteString.length; i++)
        {
            ia[i] = byteString.charCodeAt(i);
        }

        return ab;
    }

    // returns promise
    $scope.uploadDropbox = function(client, filename, arrayBuffer)
    {
        var deferred = $q.defer();

        console.log("Uploading: "+filename+" ["+arrayBuffer.byteLength+" bytes]");

        var xhr = client.writeFile(filename, arrayBuffer, function(error, stat) {
            if (error)
            {
                console.log(error);

                deferred.reject();
                return;
            }

            console.log(stat);

            console.log("uploaded: "+filename);

            // downloadHack dox: https://blogs.dropbox.com/developers/2013/08/programmatically-download-content-from-share-links/

            var xhr2 = client.makeUrl(stat.path, {download: true, downloadHack: true}, function(error, res) {
                console.log(res);

                deferred.resolve({
                    url: res.url,
                    expiresAt: res.expiresAt
                });
            });
        });

        /* xhr.upload.addEventListener("progress", function(e) {
            $timeout(function() {
                if (e.lengthComputable)
                {
                    console.log( e.loaded * 100 / e.total );
                }
            });
        }, false); */

        return deferred.promise;
    }

    $scope.addRandomPhoto = function() {

        var url = "http://lorempixel.com/1024/768/"; // assets/photos/"+$scope.rand(1, 25)+".jpg";

        $scope.addPhoto(url);
    }

    $scope.save = function() {
        localStorage.album = JSON.stringify($scope.photos);
    }

    $scope.addPhoto = function(url) {
        $ionicLoading.show({
            template: 'Processing...'
        });

        var xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.responseType = 'arraybuffer';

        xhr.onload = function() {
            console.log("loaded: "+url);

            var arrayBufferView = new Uint8Array( this.response );
            var blob = new Blob( [ arrayBufferView ], { type: "image/jpeg" } );
            var urlCreator = window.URL || window.webkitURL;
            var imageUrl = urlCreator.createObjectURL( blob );

            var guid = $scope.guid();

            var thumbDim = 200;

            $scope.generateThumbnail(imageUrl, thumbDim, function(res) {

                // console.log(thumbURI);

                var thumb = $scope.dataURItoBlob(res.url);

                var tFile = guid+"_t.jpg";
                var oFile = guid+"_o.jpg";

                $scope.uploadDropbox(globals.client, tFile, thumb).then(
                    function(tRes) {
                        // success

                        $scope.uploadDropbox(globals.client, oFile, xhr.response).then(
                            function(oRes) {
                                $scope.photos.push({
                                    thumb: res.url,
                                    thumbUrl: tRes.url,
                                    originalUrl: oRes.url,
                                    oWidth: res.width,
                                    oHeight: res.height,
                                    tWidth: thumbDim,
                                    tHeight: thumbDim,
                                    guid: guid
                                });

                                console.log($scope.photos);

                                $ionicLoading.hide();
                            },
                            function() {
                                // TODO delete thumbnail
                            });
                    },
                    function() {

                    });
            });
        }

        xhr.onerror = function() {
            console.log("error!");
        }

        xhr.send();
    }

    $scope.viewAlbum = function() {
        $ionicModal.fromTemplateUrl('album.html', {
            scope: $scope,
            animation: 'slide-in-up'
        }).then(function(modal) {
            $scope.albumModal = modal;

            /* $scope.photos.push({
                thumbUrl: 'https://dl.dropboxusercontent.com/s/l09asgnj1dq4fku/bulb.jpg'
            });

            $scope.photos.push({
                thumbUrl: 'https://dl.dropboxusercontent.com/s/0n4g5k8p8w9surk/2e56039d-c830-4fcd-9300-07d9f12946df_t.jpg'
            }); */

            var n = $scope.photos.length;
            for (var k=0; k<n; k++)
            {
                (function() {
                    var item = $scope.photos[k];

                    item.loadedThumb = "img/spinner.gif";

                    var xhr = new XMLHttpRequest();
                    xhr.open("GET", item.thumbUrl, true);
                    xhr.responseType = 'blob';

                    xhr.onload = function() {
                        console.log("success!");

                        $timeout(function() {
                            item.loadedThumb = URL.createObjectURL(xhr.response);

                            // console.log(item);
                        });
                    };

                    xhr.onerror = function() {
                        console.log("error");
                    };

                    xhr.send();
                })();
            }

            $scope.albumModal.show();
        });
    }

    $scope.showFullSize = function(item) {
        $ionicModal.fromTemplateUrl('full-size.html', {
            scope: $scope,
            animation: 'slide-in-up'
        }).then(function(modal) {
            $scope.fullSizeModal = modal;

            $scope.item = item;

            $scope.url = "img/spinner.gif";
            $scope.size = 0;

            var xhr = new XMLHttpRequest();
            xhr.open("GET", item.originalUrl, true);
            xhr.responseType = 'blob';

            xhr.onload = function() {
                console.log("success!");

                $timeout(function() {
                    $scope.url = URL.createObjectURL(xhr.response);
                    $scope.size = xhr.response.size;
                });
            };

            xhr.onerror = function() {
                console.log("error");
            };

            xhr.send();

            $scope.fullSizeModal.show();
        });
    }
}]);