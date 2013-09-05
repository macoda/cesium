/*global define*/
define([
        '../../Core/Cartesian2',
        '../../Core/Cartesian3',
        '../../Core/Cartesian4',
        '../../Core/Cartographic',
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/DeveloperError',
        '../../Core/Ellipsoid',
        '../../Core/FAR',
        '../../Core/IntersectionTests',
        '../../Core/Math',
        '../../Core/Matrix4',
        '../../Core/Ray',
        '../../Core/Transforms',
        '../../Scene/SceneMode',
        '../createCommand',
        '../ToggleButtonViewModel',
        '../../ThirdParty/sprintf',
        '../../ThirdParty/knockout'
    ], function(
        Cartesian2,
        Cartesian3,
        Cartesian4,
        Cartographic,
        defined,
        defineProperties,
        DeveloperError,
        Ellipsoid,
        FAR,
        IntersectionTests,
        CesiumMath,
        Matrix4,
        Ray,
        Transforms,
        SceneMode,
        createCommand,
        ToggleButtonViewModel,
        sprintf,
        knockout) {
    "use strict";

    var maxZoomRingAngle = 45;
    var maxTiltRingAngle = 45;
    var maxPointerDistance = 40;

    var NavigationViewModel = function(canvas, cameraController) {
        if (!defined(canvas)) {
            throw new DeveloperError('canvas is required.');
        }

        if (!defined(cameraController)) {
            throw new DeveloperError('cameraController is required.');
        }

        this._canvas = canvas;
        this._cameraController = cameraController;
        this._ellipsoid = Ellipsoid.WGS84;

        this.maximumMovementRatio = 0.1;
        this.minimumZoomDistance = 20.0;
        this.maximumZoomDistance = Number.POSITIVE_INFINITY;

        this.zoomRingDragging = false;
        this.tiltRingDragging = false;
        this.northRingDragging = false;
        this.panJoystickDragging = false;

        var radius = this._ellipsoid.getMaximumRadius();
        this._zoomFactor = 1;
        this._rotateFactor = 1.0 / radius;
        this._rotateRateAdjustment = radius;
        this._maximumRotateRate = 1.77;
        this._minimumRotateRate = 1.0 / 5000.0;
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

    var rotate3DRestrictedDirection = Cartesian4.ZERO.clone();
    function rotate3D(object, transform, constrainedAxis, restrictedAngle) {
        var cameraController = object._cameraController;
        var oldAxis = cameraController.constrainedAxis;
        if (defined(constrainedAxis)) {
            cameraController.constrainedAxis = constrainedAxis;
        }

        var rho = cameraController._camera.position.magnitude();
        var rotateRate = object._rotateFactor * (rho - object._rotateRateRangeAdjustment);

        if (rotateRate > object._maximumRotateRate) {
            rotateRate = object._maximumRotateRate;
        }

        if (rotateRate < object._minimumRotateRate) {
            rotateRate = object._minimumRotateRate;
        }

        var thetaRatio = 0;
        if (Math.abs(object._tiltRingAngle) > 3) {
            thetaRatio = object._tiltRingAngle / 7200;
        }
        thetaRatio = Math.min(thetaRatio, object.maximumMovementRatio);
        var deltaTheta = -rotateRate * thetaRatio;

        cameraController.rotateUp(deltaTheta, transform);

        if (defined(restrictedAngle)) {
            var direction = Cartesian3.clone(cameraController._camera.getDirectionWC(), rotate3DRestrictedDirection);
            var invTransform = transform.inverseTransformation();
            Matrix4.multiplyByVector(invTransform, direction, direction);

            var dot = -Cartesian3.dot(direction, constrainedAxis);
            var angle = Math.acos(dot);
            if (angle > restrictedAngle) {
                angle -=restrictedAngle;
                cameraController.rotateUp(-angle, transform);
            }
        }

        cameraController.constrainedAxis = oldAxis;
    }

    function pan3D(object) {
        var cameraController = object._cameraController;

        var magnitude = object._pointerDistance;
        var angle = CesiumMath.TWO_PI * object._pointerDirection / 360;

        if (!defined(cameraController.constrainedAxis)) {
            // CAMERA TODO: implement for constrainedAxis
        } else {
            var deltaPhi = 0;
            var deltaTheta = 0;
            if (magnitude > 5) {
                deltaPhi = magnitude * Math.cos(angle) / 1000;
                deltaTheta = magnitude * Math.sin(angle) / 1000;
            }

            cameraController.rotateRight(deltaPhi);
            cameraController.rotateUp(deltaTheta);
        }
    }

    var zoom3DUnitPosition = new Cartesian3();
    function zoom3D(object) {
        var camera = object._cameraController._camera;
        var ellipsoid = object._ellipsoid;

        var height = ellipsoid.cartesianToCartographic(camera.position).height;
        var unitPosition = Cartesian3.normalize(camera.position, zoom3DUnitPosition);

        handleZoom(object, object._zoomFactor, height, Cartesian3.dot(unitPosition, camera.direction));
    }

    var tilt3DWindowPos = new Cartesian2();
    var tilt3DRay = new Ray();
    var tilt3DCart = new Cartographic();
    var tilt3DCenter = Cartesian4.UNIT_W.clone();
    var tilt3DTransform = new Matrix4();
    function tilt3D(object) {
        var cameraController = object._cameraController;
        var ellipsoid = object._ellipsoid;

        var minHeight = object.minimumZoomDistance * 0.25;
        var height = ellipsoid.cartesianToCartographic(object._cameraController._camera.position).height;
        if (height - minHeight - 1.0 < CesiumMath.EPSILON3 && object._tiltRingAngle < 0) {
            return;
        }

        var windowPosition = tilt3DWindowPos;
        windowPosition.x = object._canvas.clientWidth / 2;
        windowPosition.y = object._canvas.clientHeight / 2;
        var ray = cameraController.getPickRay(windowPosition, tilt3DRay);

        var center;
        var intersection = IntersectionTests.rayEllipsoid(ray, ellipsoid);
        if (defined(intersection)) {
            center = ray.getPoint(intersection.start, tilt3DCenter);
        } else {
            var grazingAltitudeLocation = IntersectionTests.grazingAltitudeLocation(ray, ellipsoid);
            if (!defined(grazingAltitudeLocation)) {
                return;
            }
            var grazingAltitudeCart = ellipsoid.cartesianToCartographic(grazingAltitudeLocation, tilt3DCart);
            grazingAltitudeCart.height = 0.0;
            center = ellipsoid.cartographicToCartesian(grazingAltitudeCart, tilt3DCenter);
        }

        var camera = cameraController._camera;
        center = camera.worldToCameraCoordinates(center, center);
        var transform = Transforms.eastNorthUpToFixedFrame(center, ellipsoid, tilt3DTransform);

        var oldEllipsoid = object._ellipsoid;
        object.setEllipsoid(Ellipsoid.UNIT_SPHERE);

        var angle = (minHeight * 0.25) / (Cartesian3.subtract(center, camera.position).magnitude());
        rotate3D(object, transform, Cartesian3.UNIT_Z, CesiumMath.PI_OVER_TWO - angle);

        object.setEllipsoid(oldEllipsoid);
    }

    function update2D(object) {

    }

    function updateCV(object) {

    }

    function update3D(object) {
        zoom3D(object);
        pan3D(object);
        tilt3D(object);
    }

    function resetPointers(object) {
        if (!object.zoomRingDragging) {
            if (Math.abs(object.zoomRingAngle) > CesiumMath.EPSILON3) {
                object.zoomRingAngle *= 0.9;
            } else {
                object.zoomRingAngle = 0;
            }
        }

        if (!object.tiltRingDragging) {
            if (Math.abs(object.tiltRingAngle) > CesiumMath.EPSILON3) {
                object.tiltRingAngle *= 0.9;
            } else {
                object.tiltRingAngle = 0;
            }
        }

        if (!object.panJoystickDragging) {
            if (Math.abs(object.pointerDistance) > CesiumMath.EPSILON3) {
                object.pointerDistance *= 0.9;
            } else {
                object.pointerDistance = 0;
            }
        }
    }

    NavigationViewModel.prototype.setEllipsoid = function(ellipsoid) {
        ellipsoid = ellipsoid || Ellipsoid.WGS84;
        var radius = ellipsoid.getMaximumRadius();
        this._ellipsoid = ellipsoid;
        this._rotateFactor = 1.0 / radius;
        this._rotateRateRangeAdjustment = radius;
    };

    NavigationViewModel.prototype.update = function(mode) {
        resetPointers(this);
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