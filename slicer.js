/* ---- Utils */

/* File -> (BlobUrl -> ()) -> () */
function loadFile (file, callback) {
    var reader = new FileReader();
    reader.onload = function (e) { callback(e.target.result); }
    reader.readAsDataURL(file);
}

/* BlobUrl -> (ImageData -> ()) -> () */
function generateImageData (blobUrl, callback) {
    var image = document.createElement("img");
    image.onload = function () {
        var canvas = document.createElement("canvas");
        canvas.width  = image.naturalWidth;
        canvas.height = image.naturalHeight;

        var ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);
        image.remove();

        var data = ctx.getImageData(0, 0, image.naturalWidth, image.naturalHeight);
        canvas.remove();

        return callback(data);
    }
    image.src = blobUrl;
}

/* ImageData -> Float64Array */
function imageDataToPowerArray (data, baseColor) {
    var length = data.width * data.height;
    var arr = new Float64Array(length);

    for (var ix = 0; ix < length; ix++) {
        if (data.data[ix * 4 + 3] != 255) {
            arr[ix] = -1;
        } else {
            arr[ix] = Math.sqrt(
                Math.pow(data.data[ix * 4 + 0] - baseColor[0], 2)
                + Math.pow(data.data[ix * 4 + 1] - baseColor[1], 2)
                + Math.pow(data.data[ix * 4 + 2] - baseColor[2], 2)
            ) / 255 / SQRT3;
        }
    }

    return arr;
}

function renderSlice (canvas, imageData, powerArray, slice) {
    canvas.width  = imageData.width;
    canvas.height = imageData.height;

    var length = powerArray.length;
    var arr = new Uint8ClampedArray(length * 4);

    for (var i = 0; i < length; i++) {
        var satisfied = slice.some(function (range) {
            return (range[0] ? -1 : range[1]) <= powerArray[i] && powerArray[i] < range[2];
        });
        if (satisfied) {
            arr[i * 4 + 3] = 255;
        } else {
            arr[i * 4 + 0] = arr[i * 4 + 1] = arr[i * 4 + 2] = arr[i * 4 + 3] = 255;
        }
    }

    canvas.getContext("2d").putImageData(new ImageData(arr, imageData.height, imageData.width), 0, 0);
}

function renderBaseImage (canvas, imageData, powerArray) {
    canvas.width  = imageData.width;
    canvas.height = imageData.height;

    var length = powerArray.length;
    var arr = new Uint8ClampedArray(length * 4);

    for (var i = 0; i < length; i++) {
        if (powerArray[i] >= 0) {
            arr[i * 4 + 0] = arr[i * 4 + 1] = arr[i * 4 + 2] = powerArray[i] * 255;
            arr[i * 4 + 3] = 255;
        }
    }

    canvas.getContext("2d").putImageData(new ImageData(arr, imageData.height, imageData.width), 0, 0);
}

/* ---- main */

var SQRT3 = Math.sqrt(3);

var STATUSES = { INITIAL: 0, LOADING: 1, LOADED: 2 };

var vm = new Vue({
    el: "#app",
    data: {
        status: STATUSES.INITIAL,
        source: {
            imageData: null,
            blobUrl: "",
            powerArray: null
        },
        baseColor: [0, 0, 0],
        slice1: [[false, 0, 1.02]],
        slice2: [[false, 0, 1.02]]
    },
    watch: {
        baseColor: {
            handler: function () { vm.refreshPowerImage(); },
            deep: true
        },
        slice1: {
            handler: function () { vm.refreshSlice1(); },
            deep: true
        },
        slice2: {
            handler: function () { vm.refreshSlice2(); },
            deep: true
        }
    },
    methods: {
        onFileChange: function (e) {
            this.status = STATUSES.LOADING;
            loadFile(e.target.files[0], function (blobUrl) {
                generateImageData(blobUrl, function (imageData) {
                    vm.source.blobUrl = blobUrl;
                    vm.source.imageData = imageData;
                    vm.refreshPowerImage();
                    vm.refreshSlice1();
                    vm.refreshSlice2();
                    vm.status = STATUSES.LOADED;
                });
            });
        },
        refreshPowerImage: function () {
            vm.source.powerArray = imageDataToPowerArray(vm.source.imageData, vm.baseColor);
            renderBaseImage(vm.$refs.canvasBase, vm.source.imageData, vm.source.powerArray);
        },
        refreshSlice1: function () {
            renderSlice(vm.$refs.canvas1, vm.source.imageData, vm.source.powerArray, vm.slice1);
        },
        addRange1: function () {
            vm.slice1.push([false, 0, 1.02]);
        },
        deleteRange1: function (ix) {
            vm.slice1.splice(ix, 1);
        },
        refreshSlice2: function () {
            renderSlice(vm.$refs.canvas2, vm.source.imageData, vm.source.powerArray, vm.slice2);
        },
        addRange2: function () {
            vm.slice2.push([false, 0, 1.02]);
        },
        deleteRange2: function (ix) {
            vm.slice2.splice(ix, 1);
        }
    },
});
