/*global defineSuite*/
defineSuite([
         'Widgets/Navigation/NavigationViewModel',
         'Core/Cartesian2',
         'Core/Cartesian3',
         'Core/Ellipsoid',
         'Core/GeographicProjection',
         'Core/IntersectionTests',
         'Core/Math',
         'Core/Matrix4',
         'Core/Ray',
         'Scene/Camera',
         'Scene/OrthographicFrustum',
         'Scene/SceneMode'
     ], function(
         NavigationViewModel,
         Cartesian2,
         Cartesian3,
         Ellipsoid,
         GeographicProjection,
         IntersectionTests,
         Math,
         Matrix4,
         Ray,
         Camera,
         OrthographicFrustum,
         SceneMode) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var canvas;
    var camera;
    var viewModel;

    // create a mock canvas object to add events to so they are callable.
    var MockCanvas = function() {
        this.disableRootEvents = true;
        this.clientWidth = 1024;
        this.clientHeight = 768;
    };

    MockCanvas.prototype.getBoundingClientRect = function() {
        return {
            left : 0,
            top : 0,
            width : 0,
            height : 0
        };
    };

    var Direction = {
            RIGHT : 0,
            UP : 90,
            LEFT : 180,
            DOWN : -90
    };

    beforeEach(function() {
       canvas = new MockCanvas();
       camera = new Camera(canvas);
       viewModel = new NavigationViewModel(canvas, camera.controller);
    });

    afterEach(function() {

    });

    it('constructor throws without a canvas', function() {
        expect(function() {
           return new NavigationViewModel();
        }).toThrow();
    });

    it('constructor throws without a camera', function() {
       expect(function() {
           return new NavigationViewModel(new MockCanvas());
       }).toThrow();
    });

    it('get/set ellipsoid', function() {
       expect(viewModel.getEllipsoid()).toEqual(Ellipsoid.WGS84);
       viewModel.setEllipsoid(Ellipsoid.UNIT_SPHERE);
       expect(viewModel.getEllipsoid()).toEqual(Ellipsoid.UNIT_SPHERE);
    });

    function updateViewModel(frameState) {
        camera.controller.update(frameState.mode, frameState.scene2D);
        viewModel.update(frameState.mode);
    }

    function setUp2D() {
        var ellipsoid = Ellipsoid.WGS84;
        var projection = new GeographicProjection(ellipsoid);
        var frameState = {
            mode : SceneMode.SCENE2D,
            scene2D : {
                projection : projection
            }
        };
        var maxRadii = ellipsoid.getMaximumRadius();
        var frustum = new OrthographicFrustum();
        frustum.right = maxRadii * Math.PI;
        frustum.left = -frustum.right;
        frustum.top = frustum.right * (canvas.clientHeight / canvas.clientWidth);
        frustum.bottom = -frustum.top;
        frustum.near = 0.01 * maxRadii;
        frustum.far = 60.0 * maxRadii;
        camera.frustum = frustum;

        camera.position = new Cartesian3(0.0, 0.0, maxRadii);
        camera.direction = Cartesian3.UNIT_Z.negate();
        camera.up = Cartesian3.UNIT_Y.clone();
        camera.right = Cartesian3.UNIT_X.clone();
        camera.transform = new Matrix4(0.0, 0.0, 1.0, 0.0,
                1.0, 0.0, 0.0, 0.0,
                0.0, 1.0, 0.0, 0.0,
                0.0, 0.0, 0.0, 1.0);

        return frameState;
    }

    it('translate right in 2D', function() {
       var frameState = setUp2D();
       var position = camera.position.clone();

       viewModel.pointerDirection = Direction.RIGHT;
       viewModel.pointerDistance = 50;

       updateViewModel(frameState);
       expect(position.x).toBeLessThan(camera.position.x);
       expect(position.y).toEqual(camera.position.y);
       expect(position.z).toEqual(camera.position.z);
    });

    it('translate left in 2D', function() {
        var frameState = setUp2D();
        var position = camera.position.clone();

        viewModel.pointerDirection = Direction.LEFT;
        viewModel.pointerDistance = 50;

        updateViewModel(frameState);
        expect(position.x).toBeGreaterThan(camera.position.x);
        expect(position.y).toEqual(camera.position.y);
        expect(position.z).toEqual(camera.position.z);
    });

    it('translate up in 2D', function() {
       var frameState = setUp2D();
       var position = camera.position.clone();

       viewModel.pointerDirection = Direction.UP;
       viewModel.pointerDistance = 50;

       updateViewModel(frameState);
       expect(position.y).toBeGreaterThan(camera.position.y);
       expect(position.x).toEqual(camera.position.x);
       expect(position.z).toEqual(camera.position.z);
    });

    it('translate down in 2D', function() {
       var frameState = setUp2D();
       var position = camera.position.clone();

       viewModel.pointerDirection = Direction.DOWN;
       viewModel.pointerDistance = 50;

       updateViewModel(frameState);
       expect(position.y).toBeLessThan(camera.position.y);
       expect(position.x).toEqual(camera.position.x);
       expect(position.z).toEqual(camera.position.z);
    });

    it('zoom-in in 2D', function() {
       var frameState = setUp2D();
       var position = camera.position.clone();
       var frustumDiff = camera.frustum.right - camera.frustum.left;

       viewModel.zoomRingAngle = 20;

       updateViewModel(frameState);
       expect(position.x).toEqual(camera.position.x);
       expect(position.y).toEqual(camera.position.y);
       expect(position.z).toEqual(camera.position.z);
       expect(frustumDiff).toBeGreaterThan(camera.frustum.right - camera.frustum.left);
    });

    it('zoom-out in 2D', function() {
       var frameState = setUp2D();
       var position = camera.position.clone();
       var frustumDiff = camera.frustum.right - camera.frustum.left;

       viewModel.zoomRingAngle = -20;

       updateViewModel(frameState);
       expect(position.x).toEqual(camera.position.x);
       expect(position.y).toEqual(camera.position.y);
       expect(position.z).toEqual(camera.position.z);
       expect(frustumDiff).toBeLessThan(camera.frustum.right - camera.frustum.left);
    });
});