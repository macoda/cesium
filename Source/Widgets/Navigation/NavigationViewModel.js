/*global define*/
define([
        '../../Core/Cartesian3',
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/DeveloperError',
        '../../Core/Ellipsoid',
        '../../Core/FAR',
        '../../Core/Math',
        '../../Scene/SceneMode',
        '../createCommand',
        '../ToggleButtonViewModel',
        '../../ThirdParty/sprintf',
        '../../ThirdParty/knockout'
    ], function(
        Cartesian3,
        defined,
        defineProperties,
        DeveloperError,
        Ellipsoid,
        FAR,
        CesiumMath,
        SceneMode,
        createCommand,
        ToggleButtonViewModel,
        sprintf,
        knockout) {
    "use strict";

    var maxZoomRingAngle = 45;
    var maxTiltRingAngle = 45;
    var maxPointerDistance = 40;

    var NavigationViewModel = function(cameraController) {
        if (!defined(cameraController)) {
            throw new DeveloperError('cameraController is required.');
        }

        this._cameraController = cameraController;
        this._ellipsoid = Ellipsoid.WGS84;

        this.maximumMovementRatio = 0.1;
        this.minimumZoomDistance = 20.0;
        this.maximumZoomDistance = Number.POSITIVE_INFINITY;

        this.zoomRingDragging = false;
        this.tiltRingDragging = false;
        this.northRingDragging = false;
        this.panJoystickDragging = false;

        this._zoomFactor = 1;
        this._minimumZoomRate = 20.0;
        this._maximumZoomRate = FAR;

        this._zoomRingAngle = 0;
        this._tiltRingAngle = 0;
        this._northRingAngle = 0;
        this._pointerDistance = 0;
        this._pointerDirection = 0;

        knockout.track(this, ['_zoomRingAngle', '_tiltRingAngle', '_northRingAngle', '_pointerDistance', '_pointerDirection']);

        knockout.defineProperty(this, 'zoomRingAngle', {
            get : function () {
                return this._zoomRingAngle;
            },
            set : function (angle) {
                angle = Math.max(Math.min(angle, maxZoomRingAngle), -maxZoomRingAngle);
                this._zoomRingAngle = angle;
            }
        });

        knockout.defineProperty(this, 'tiltRingAngle', {
            get : function () {
                return this._tiltRingAngle;
            },
            set : function (angle) {
                angle = Math.max(Math.min(angle, maxTiltRingAngle), -maxTiltRingAngle);
                this._tiltRingAngle = angle;
            }
        });

        knockout.defineProperty(this, 'northRingAngle', {
            get : function () {
                return this._northRingAngle;
            },
            set : function (angle) {
                this._northRingAngle = angle;
            }
        });

        knockout.defineProperty(this, 'pointerDistance', {
            get : function () {
                return this._pointerDistance;
            },
            set : function (distance) {
                distance = Math.min(distance, maxPointerDistance);
                this._pointerDistance = distance;
            }
        });

        knockout.defineProperty(this, 'pointerDirection', {
            get : function () {
                return this._pointerDirection;
            },
            set : function (direction) {
                this._pointerDirection = direction;
            }
        });

        this._zoomIn = createCommand(function() {
            this.zoomRingAngle-=0.25;
            console.log("Zoom In!");
        });

        this._zoomOut = createCommand(function() {
            this.zoomRingAngle+=0.25;
            console.log("Zoom Out!");
        });

    };

    defineProperties(NavigationViewModel.prototype, {
        zoomIn : {
            get : function() {
                return this._zoomIn;
            }
        },

        zoomOut : {
            get : function() {
                return this._zoomOut;
            }
        }
    });

    function handleZoom(object, zoomFactor, distanceMeasure, unitPositionDotDirection) {
        var percentage = 1.0;
        if (defined(unitPositionDotDirection)) {
            percentage = CesiumMath.clamp(Math.abs(unitPositionDotDirection), 0.25, 1.0);
        }

        var minHeight = object.minimumZoomDistance * percentage;
        var maxHeight = object.maximumZoomDistance;

        var minDistance = distanceMeasure - minHeight;
        var zoomRate = zoomFactor * minDistance;
        zoomRate = CesiumMath.clamp(zoomRate, object._minimumZoomRate, object._maximumZoomRate);

        var zoomAngleRatio = 0;
        if (Math.abs(object.zoomRingAngle) > 3 && Math.abs(object.zoomRingAngle) < 25) {
            zoomAngleRatio = object.zoomRingAngle / 1440;
        } else {
            zoomAngleRatio = object.zoomRingAngle / 360;
        }
        zoomAngleRatio = Math.min(zoomAngleRatio, object.maximumMovementRatio);
        var distance = zoomRate * zoomAngleRatio;

        if (distance > 0.0 && Math.abs(distanceMeasure - minHeight) < 1.0) {
            return;
        }

        if (distance < 0.0 && Math.abs(distanceMeasure - maxHeight) < 1.0) {
            return;
        }

        if (distanceMeasure - distance < minHeight) {
            distance = distanceMeasure - minHeight - 1.0;
        } else if (distanceMeasure - distance > maxHeight) {
            distance = distanceMeasure - maxHeight;
        }

        object._cameraController.zoomIn(distance);
    }

    var zoom3DUnitPosition = new Cartesian3();
    function zoom3D(object) {
        var camera = object._cameraController._camera;
        var ellipsoid = object._ellipsoid;

        var height = ellipsoid.cartesianToCartographic(camera.position).height;
        var unitPosition = Cartesian3.normalize(camera.position, zoom3DUnitPosition);

        handleZoom(object, object._zoomFactor, height, Cartesian3.dot(unitPosition, camera.direction));
    }

    function update2D(object) {

    }

    function updateCV(object) {

    }

    function update3D(object) {
        zoom3D(object);
    }

    NavigationViewModel.prototype.update = function(mode) {

        if (!this.zoomRingDragging) {
            if (Math.abs(this.zoomRingAngle) > CesiumMath.EPSILON3) {
                this.zoomRingAngle *= 0.9;
            } else {
                this.zoomRingAngle = 0;
            }
        }

        if (mode === SceneMode.SCENE2D) {
            update2D(this);
        } else if (mode === SceneMode.COLUMBUS_VIEW) {
            this._horizontalRotationAxis = Cartesian3.UNIT_Z;
            updateCV(this);
        } else if (mode === SceneMode.SCENE3D) {
            this._horizontalRotationAxis = undefined;
            update3D(this);
        }
    };

    return NavigationViewModel;
});