/*global define,console*/
define([
        'require',
        'dojo/_base/declare',
        'dojo/ready',
        'dojo/_base/lang',
        'dojo/_base/event',
        'dojo/dom-style',
        'dojo/on',
        'dijit/_WidgetBase',
        'dijit/_TemplatedMixin',
        'dijit/_WidgetsInTemplateMixin',
        'dijit/form/Button',
        'dijit/form/ToggleButton',
        'dijit/form/DropDownButton',
        'dijit/TooltipDialog',
        './TimelineWidget',
        '../../Core/defaultValue',
        '../../Core/loadJson',
        '../../Core/BoundingRectangle',
        '../../Core/Clock',
        '../../Core/ClockStep',
        '../../Core/ClockRange',
        '../../Core/Extent',
        '../../Core/AnimationController',
        '../../Core/Ellipsoid',
        '../../Core/Iso8601',
        '../../Core/Fullscreen',
        '../../Core/computeSunPosition',
        '../../Core/ScreenSpaceEventHandler',
        '../../Core/FeatureDetection',
        '../../Core/ScreenSpaceEventType',
        '../../Core/Cartesian2',
        '../../Core/Cartesian3',
        '../../Core/JulianDate',
        '../../Core/DefaultProxy',
        '../../Core/Transforms',
        '../../Core/requestAnimationFrame',
        '../../Core/Color',
        '../../Core/Matrix4',
        '../../Core/Math',
        '../../Scene/PerspectiveFrustum',
        '../../Scene/Material',
        '../../Scene/Scene',
        '../../Scene/CameraColumbusViewMode',
        '../../Scene/CentralBody',
        '../../Scene/BingMapsImageryProvider',
        '../../Scene/BingMapsStyle',
        '../../Scene/SceneTransitioner',
        '../../Scene/SingleTileImageryProvider',
        '../../Scene/PerformanceDisplay',
        '../../Scene/SceneMode',
        '../../Scene/SkyBox',
        '../../Scene/SkyAtmosphere',
        '../../DynamicScene/processCzml',
        '../../DynamicScene/DynamicObjectView',
        '../../DynamicScene/DynamicObjectCollection',
        '../../DynamicScene/VisualizerCollection',
        'dojo/text!./CesiumViewerWidget.html'
    ], function (
        require,
        declare,
        ready,
        lang,
        event,
        domStyle,
        on,
        _WidgetBase,
        _TemplatedMixin,
        _WidgetsInTemplateMixin,
        Button,
        ToggleButton,
        DropDownButton,
        TooltipDialog,
        TimelineWidget,
        defaultValue,
        loadJson,
        BoundingRectangle,
        Clock,
        ClockStep,
        ClockRange,
        Extent,
        AnimationController,
        Ellipsoid,
        Iso8601,
        Fullscreen,
        computeSunPosition,
        ScreenSpaceEventHandler,
        FeatureDetection,
        ScreenSpaceEventType,
        Cartesian2,
        Cartesian3,
        JulianDate,
        DefaultProxy,
        Transforms,
        requestAnimationFrame,
        Color,
        Matrix4,
        CesiumMath,
        PerspectiveFrustum,
        Material,
        Scene,
        CameraColumbusViewMode,
        CentralBody,
        BingMapsImageryProvider,
        BingMapsStyle,
        SceneTransitioner,
        SingleTileImageryProvider,
        PerformanceDisplay,
        SceneMode,
        SkyBox,
        SkyAtmosphere,
        processCzml,
        DynamicObjectView,
        DynamicObjectCollection,
        VisualizerCollection,
        template) {
    "use strict";

    /**
     * This Dojo widget wraps the full functionality of Cesium Viewer.
     *
     * @class CesiumViewerWidget
     * @param {Object} options - A list of options to pre-configure the widget.  Names matching member fields/functions will override the default values.
     */
    return declare('Cesium.CesiumViewerWidget', [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin],
    /** @lends CesiumViewerWidget */
    {
        // for Dojo use only
        templateString : template,

        /**
         * Enable streaming Imagery.  This is read-only after construction.
         *
         * @type {Boolean}
         * @memberof CesiumViewerWidget.prototype
         * @default true
         * @see CesiumViewerWidget#enableStreamingImagery
         */
        useStreamingImagery : true,
        /**
         * The map style for streaming imagery.  This is read-only after construction.
         *
         * @type {BingMapsStyle}
         * @memberof CesiumViewerWidget.prototype
         * @default {@link BingMapsStyle.AERIAL}
         * @see CesiumViewerWidget#setStreamingImageryMapStyle
         */
        mapStyle : BingMapsStyle.AERIAL,
        /**
         * The URL for a daytime image on the globe.
         *
         * @type {String}
         * @memberof CesiumViewerWidget.prototype
         */
        dayImageUrl : undefined,
        /**
         * Determines if a sky box with stars is drawn around the globe.  This is read-only after construction.
         *
         * @type {Boolean}
         * @memberof CesiumViewerWidget.prototype
         * @default true
         * @see SkyBox
         */
        showSkyBox : true,
        /**
         * An object containing settings supplied by the end user, typically from the query string
         * of the URL of the page with the widget.
         *
         * @type {Object}
         * @memberof CesiumViewerWidget.prototype
         * @example
         * var ioQuery = require('dojo/io-query');
         * var endUserOptions = {};
         * if (window.location.search) {
         *     endUserOptions = ioQuery.queryToObject(window.location.search.substring(1));
         * }
         *
         * @example
         * var endUserOptions = {
         *     'source' : 'file.czml', // The relative URL of the CZML file to load at startup.
         *     'lookAt' : '123abc',    // The CZML ID of the object to track at startup.
         *     'stats'  : 1,           // Enable the FPS performance display.
         *     'debug'  : 1,           // Full WebGL error reporting at substantial performance cost.
         * };
         */
        endUserOptions : {},
        /**
         * Check for WebGL errors after every WebGL API call.  Enabling this debugging feature
         * comes at a substantial performance cost, halting and restarting the graphics
         * pipeline hundreds of times per frame.  But it can uncover problems that are otherwise
         * very difficult to diagnose.
         * This property is read-only after construction.
         *
         * @type {Boolean}
         * @memberof CesiumViewerWidget.prototype
         * @default false
         */
        enableWebGLDebugging: false,
        /**
         * Allow the user to drag-and-drop CZML files into this widget.
         * This is read-only after construction.
         *
         * @type {Boolean}
         * @memberof CesiumViewerWidget.prototype
         * @default false
         */
        enableDragDrop: false,
        /**
         * Register this widget's resize handler to get called every time the browser window
         * resize event fires.  This is read-only after construction.  Generally this should
         * be true for full-screen widgets, and true for
         * fluid layouts where the widget is likely to change size at the same time as the
         * window.  The exception is, if you use a Dojo layout where this widget exists inside
         * a Dojo ContentPane or similar, you should set this to false, because Dojo will perform
         * its own layout calculations and call this widget's resize handler automatically.
         * This can also be false for a fixed-size widget.
         *
         * If unsure, test the widget with this set to false, and if window resizes cause the
         * globe to stretch, change this to true.
         *
         * @type {Boolean}
         * @memberof CesiumViewerWidget.prototype
         * @default true
         * @see CesiumViewerWidget#resize
         */
        resizeWidgetOnWindowResize: true,
        /**
         * The HTML element to place into fullscreen mode when the corresponding
         * button is pressed.  If undefined, only the widget itself will
         * go into fullscreen mode.  By specifying another container, such
         * as document.body, this property allows an application to retain
         * any overlaid or surrounding elements when in fullscreen.
         *
         * @type {Object}
         * @memberof CesiumViewerWidget.prototype
         * @default undefined
         */
        fullscreenElement : undefined,

        // for Dojo use only
        constructor : function() {
            this.ellipsoid = Ellipsoid.WGS84;
        },

        /**
         * This function will get a callback in the event of setup failure, likely indicating
         * a problem with WebGL support or the availability of a GL context.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Object} widget - A reference to this widget
         * @param {Object} error - The exception that was thrown during setup
         */
        onSetupError : function(widget, error) {
            console.error(error);
        },

        /**
         * This function must be called when the widget changes size.  It updates the canvas
         * size, camera aspect ratio, and viewport size.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @see CesiumViewerWidget#resizeWidgetOnWindowResize
         */
        resize : function() {
            var width = this.canvas.clientWidth, height = this.canvas.clientHeight;

            if (typeof this.scene === 'undefined' || (this.canvas.width === width && this.canvas.height === height)) {
                return;
            }

            this.canvas.width = width;
            this.canvas.height = height;

            var frustum = this.scene.getCamera().frustum;
            if (typeof frustum.aspectRatio !== 'undefined') {
                frustum.aspectRatio = width / height;
            } else {
                frustum.top = frustum.right * (height / width);
                frustum.bottom = -frustum.top;
            }
        },

        /**
         * Have the camera track a particular object based on the result of a pick.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Object} selectedObject - The object to track, or <code>undefined</code> to stop tracking.
         */
        centerCameraOnPick : function(selectedObject) {
            this.centerCameraOnObject(typeof selectedObject !== 'undefined' ? selectedObject.dynamicObject : undefined);
        },

        _viewFromTo : undefined,

        /**
         * Have the camera track a particular object.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Object} selectedObject - The object to track, or <code>undefined</code> to stop tracking.
         */
        centerCameraOnObject : function(selectedObject) {
            if (typeof selectedObject !== 'undefined' && typeof selectedObject.position !== 'undefined') {
                var viewFromTo = this._viewFromTo;
                if (typeof viewFromTo === 'undefined') {
                    this._viewFromTo = viewFromTo = new DynamicObjectView(selectedObject, this.scene, this.ellipsoid);
                } else {
                    viewFromTo.dynamicObject = selectedObject;
                }
            } else {
                this._viewFromTo = undefined;
            }
        },

        /**
         * Override this function to be notified when an object is selected (left-click).
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Object} selectedObject - The object that was selected, or <code>undefined</code> to de-select.
         */
        onObjectSelected : undefined,
        /**
         * Override this function to be notified when an object is right-clicked.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Object} selectedObject - The object that was selected, or <code>undefined</code> to de-select.
         */
        onObjectRightClickSelected : undefined,
        /**
         * Override this function to be notified when an object is left-double-clicked.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Object} selectedObject - The object that was selected, or <code>undefined</code> to de-select.
         */
        onObjectLeftDoubleClickSelected : undefined,
        /**
         * Override this function to be notified when an object hovered by the mouse.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Object} selectedObject - The object that was hovered, or <code>undefined</code> if the mouse moved off.
         */
        onObjectMousedOver : undefined,
        /**
         * Override this function to be notified when the left mouse button is pressed down.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Object} The object with the position of the mouse.
         */
        onLeftMouseDown : undefined,
        /**
         * Override this function to be notified when the left mouse button is released.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Object} The object with the position of the mouse.
         */
        onLeftMouseUp : undefined,
        /**
         * Override this function to be notified when the right mouse button is pressed down.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Object} The object with the position of the mouse.
         */
        onRightMouseDown : undefined,
        /**
         * Override this function to be notified when the right mouse button is released.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Object} The object with the position of the mouse.
         */
        onRightMouseUp : undefined,
        /**
         * Override this function to be notified when the left mouse button is dragged.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Object} The object with the start and end position of the mouse.
         */
        onLeftDrag : undefined,
        /**
         * Override this function to be notified when the right mouse button is dragged or mouse wheel is zoomed.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Object} The object with the start and end position of the mouse.
         */
        onZoom : undefined,

        _camera3D : undefined,

        _handleLeftClick : function(e) {
            if (typeof this.onObjectSelected !== 'undefined') {
                // Fire the selection event, regardless if it's a duplicate,
                // because the client may want to react to re-selection in some way.
                this.selectedObject = this.scene.pick(e.position);
                this.onObjectSelected(this.selectedObject);
            }
        },

        _handleRightClick : function(e) {
            if (typeof this.onObjectRightClickSelected !== 'undefined') {
                // Fire the selection event, regardless if it's a duplicate,
                // because the client may want to react to re-selection in some way.
                this.selectedObject = this.scene.pick(e.position);
                this.onObjectRightClickSelected(this.selectedObject);
            }
        },

        _handleLeftDoubleClick : function(e) {
            if (typeof this.onObjectLeftDoubleClickSelected !== 'undefined') {
                // Fire the selection event, regardless if it's a duplicate,
                // because the client may want to react to re-selection in some way.
                this.selectedObject = this.scene.pick(e.position);
                this.onObjectLeftDoubleClickSelected(this.selectedObject);
            }
        },

        _handleMouseMove : function(movement) {
            if (typeof this.onObjectMousedOver !== 'undefined') {
                // Don't fire multiple times for the same object as the mouse travels around the screen.
                var mousedOverObject = this.scene.pick(movement.endPosition);
                if (this.mousedOverObject !== mousedOverObject) {
                    this.mousedOverObject = mousedOverObject;
                    this.onObjectMousedOver(mousedOverObject);
                }
            }
            if (typeof this.leftDown !== 'undefined' && this.leftDown && typeof this.onLeftDrag !== 'undefined') {
                this.onLeftDrag(movement);
            } else if (typeof this.rightDown !== 'undefined' && this.rightDown && typeof this.onZoom !== 'undefined') {
                this.onZoom(movement);
            }
        },

        _handleRightDown : function(e) {
            this.rightDown = true;
            if (typeof this.onRightMouseDown !== 'undefined') {
                this.onRightMouseDown(e);
            }
        },

        _handleRightUp : function(e) {
            this.rightDown = false;
            if (typeof this.onRightMouseUp !== 'undefined') {
                this.onRightMouseUp(e);
            }
        },

        _handleLeftDown : function(e) {
            this.leftDown = true;
            if (typeof this.onLeftMouseDown !== 'undefined') {
                this.onLeftMouseDown(e);
            }
        },

        _handleLeftUp : function(e) {
            this.leftDown = false;
            if (typeof this.onLeftMouseUp !== 'undefined') {
                this.onLeftMouseUp(e);
            }
        },

        _handleWheel : function(e) {
            if (typeof this.onZoom !== 'undefined') {
                this.onZoom(e);
            }
        },

        _updateSpeedIndicator : function() {
            if (this.animationController.isAnimating()) {
                this.speedIndicator.innerHTML = this.clock.multiplier + 'x realtime';
            } else {
                this.speedIndicator.innerHTML = this.clock.multiplier + 'x realtime (paused)';
            }
        },

        /**
         * Apply the animation settings from a CZML buffer.
         * @function
         * @memberof CesiumViewerWidget.prototype
         */
        setTimeFromBuffer : function() {
            var clock = this.clock;

            this.animReverse.set('checked', false);
            this.animPause.set('checked', true);
            this.animPlay.set('checked', false);

            var availability = this.dynamicObjectCollection.computeAvailability();
            if (availability.start.equals(Iso8601.MINIMUM_VALUE)) {
                clock.startTime = new JulianDate();
                clock.stopTime = clock.startTime.addDays(1);
                clock.clockRange = ClockRange.UNBOUNDED;
            } else {
                clock.startTime = availability.start;
                clock.stopTime = availability.stop;
                clock.clockRange = ClockRange.LOOP;
            }

            clock.multiplier = 60;
            clock.currentTime = clock.startTime;
            this.timelineControl.zoomTo(clock.startTime, clock.stopTime);
        },

        /**
         * Removes all CZML data from the viewer.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         */
        removeAllCzml : function() {
            this.centerCameraOnObject(undefined);
            //CZML_TODO visualizers.removeAllPrimitives(); is not really needed here, but right now visualizers
            //cache data indefinitely and removeAll is the only way to get rid of it.
            //while there are no visual differences, removeAll cleans the cache and improves performance
            this.visualizers.removeAllPrimitives();
            this.dynamicObjectCollection.clear();
        },

        /**
         * Add CZML data to the viewer.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {CZML} czml - The CZML (as objects) to be processed and added to the viewer.
         * @param {string} source - The filename or URI that was the source of the CZML collection.
         * @param {string} lookAt - Optional.  The ID of the object to center the camera on.
         * @see CesiumViewerWidget#loadCzml
         */
        addCzml : function(czml, source, lookAt) {
            processCzml(czml, this.dynamicObjectCollection, source);
            this.setTimeFromBuffer();
            if (typeof lookAt !== 'undefined') {
                var lookAtObject = this.dynamicObjectCollection.getObject(lookAt);
                this.centerCameraOnObject(lookAtObject);
            }
        },

        /**
         * Asynchronously load and add CZML data to the viewer.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {string} source - The URI to load the CZML from.
         * @param {string} lookAt - Optional.  The ID of the object to center the camera on.
         * @see CesiumViewerWidget#addCzml
         */
        loadCzml : function(source, lookAt) {
            var widget = this;
            loadJson(source).then(function(czml) {
                widget.addCzml(czml, source, lookAt);
            },
            function(error) {
                console.error(error);
                window.alert(error);
            });
        },

        /**
         * This function is called when files are dropped on the widget, if drag-and-drop is enabled.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Object} event - The drag-and-drop event containing the dropped file(s).
         */
        handleDrop : function(event) {
            event.stopPropagation(); // Stops some browsers from redirecting.
            event.preventDefault();

            var files = event.dataTransfer.files;
            var f = files[0];
            var reader = new FileReader();
            var widget = this;
            widget.removeAllCzml();
            reader.onload = function(evt) {
                widget.addCzml(JSON.parse(evt.target.result), f.name);
            };
            reader.readAsText(f);
        },

        _started : false,

        /**
         * Call this after placing the widget in the DOM, to initialize the WebGL context,
         * wire up event callbacks, begin requesting CZML, imagery, etc.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @see CesiumViewerWidget#autoStartRenderLoop
         */
        startup : function() {
            if (this._started) {
                return;
            }

            var canvas = this.canvas, ellipsoid = this.ellipsoid, scene, widget = this;

            try {
                scene = this.scene = new Scene(canvas);
            } catch (ex) {
                if (typeof this.onSetupError !== 'undefined') {
                    this.onSetupError(this, ex);
                }
                return;
            }
            this._started = true;

            this.resize();

            on(canvas, 'contextmenu', event.stop);
            on(canvas, 'selectstart', event.stop);

            if (typeof widget.endUserOptions.debug !== 'undefined' && widget.endUserOptions.debug) {
                this.enableWebGLDebugging = true;
            }

            var context = scene.getContext();
            if (this.enableWebGLDebugging) {
                context.setValidateShaderProgram(true);
                context.setValidateFramebuffer(true);
                context.setLogShaderCompilation(true);
                context.setThrowOnWebGLError(true);
            }

            var imageryUrl = '../../Assets/Textures/';
            this.dayImageUrl = defaultValue(this.dayImageUrl, require.toUrl(imageryUrl + 'NE2_50M_SR_W_2048.jpg'));

            var centralBody = this.centralBody = new CentralBody(ellipsoid);

            // This logo is replicated by the imagery selector button, so it's hidden here.
            centralBody.logoOffset = new Cartesian2(-100, -100);

            this._configureCentralBodyImagery();

            scene.getPrimitives().setCentralBody(centralBody);

            if (this.showSkyBox) {
                scene.skyBox = new SkyBox({
                    positiveX: require.toUrl(imageryUrl + 'SkyBox/tycho8_px_80.jpg'),
                    negativeX: require.toUrl(imageryUrl + 'SkyBox/tycho8_mx_80.jpg'),
                    positiveY: require.toUrl(imageryUrl + 'SkyBox/tycho8_py_80.jpg'),
                    negativeY: require.toUrl(imageryUrl + 'SkyBox/tycho8_my_80.jpg'),
                    positiveZ: require.toUrl(imageryUrl + 'SkyBox/tycho8_pz_80.jpg'),
                    negativeZ: require.toUrl(imageryUrl + 'SkyBox/tycho8_mz_80.jpg')
                });
            }

            scene.skyAtmosphere = new SkyAtmosphere(ellipsoid);

            var camera = scene.getCamera();
            camera.position = camera.position.multiplyByScalar(1.5);

            var handler = new ScreenSpaceEventHandler(canvas);
            handler.setInputAction(lang.hitch(this, '_handleLeftClick'), ScreenSpaceEventType.LEFT_CLICK);
            handler.setInputAction(lang.hitch(this, '_handleRightClick'), ScreenSpaceEventType.RIGHT_CLICK);
            handler.setInputAction(lang.hitch(this, '_handleLeftDoubleClick'), ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
            handler.setInputAction(lang.hitch(this, '_handleMouseMove'), ScreenSpaceEventType.MOUSE_MOVE);
            handler.setInputAction(lang.hitch(this, '_handleLeftDown'), ScreenSpaceEventType.LEFT_DOWN);
            handler.setInputAction(lang.hitch(this, '_handleLeftUp'), ScreenSpaceEventType.LEFT_UP);
            handler.setInputAction(lang.hitch(this, '_handleWheel'), ScreenSpaceEventType.WHEEL);
            handler.setInputAction(lang.hitch(this, '_handleRightDown'), ScreenSpaceEventType.RIGHT_DOWN);
            handler.setInputAction(lang.hitch(this, '_handleRightUp'), ScreenSpaceEventType.RIGHT_UP);

            //////////////////////////////////////////////////////////////////////////////////////////////////

            if (typeof this.highlightColor === 'undefined') {
                this.highlightColor = new Color(0.0, 1.0, 0.0);
            }

            if (typeof this.highlightMaterial === 'undefined') {
                this.highlightMaterial = Material.fromType(scene.getContext(), Material.ColorType);
                this.highlightMaterial.uniforms.color = this.highlightColor;
            }

            if (typeof this.onObjectSelected === 'undefined') {
                this.onObjectSelected = function(selectedObject) {
                    if (typeof selectedObject !== 'undefined' && typeof selectedObject.dynamicObject !== 'undefined') {
                        this.centerCameraOnPick(selectedObject);
                    }
                };
            }

            if (this.enableDragDrop) {
                var dropBox = this.cesiumNode;
                on(dropBox, 'drop', lang.hitch(widget, 'handleDrop'));
                on(dropBox, 'dragenter', event.stop);
                on(dropBox, 'dragover', event.stop);
                on(dropBox, 'dragexit', event.stop);
            }

            var currentTime = new JulianDate();
            if (typeof this.animationController === 'undefined') {
                if (typeof this.clock === 'undefined') {
                    this.clock = new Clock({
                        startTime : currentTime.addDays(-0.5),
                        stopTime : currentTime.addDays(0.5),
                        currentTime : currentTime,
                        clockStep : ClockStep.SYSTEM_CLOCK_DEPENDENT,
                        multiplier : 1
                    });
                }
                this.animationController = new AnimationController(this.clock);
            } else {
                this.clock = this.animationController.clock;
            }

            var animationController = this.animationController;
            var dynamicObjectCollection = this.dynamicObjectCollection = new DynamicObjectCollection();
            var clock = this.clock;
            var transitioner = this.sceneTransitioner = new SceneTransitioner(scene);
            this.visualizers = VisualizerCollection.createCzmlStandardCollection(scene, dynamicObjectCollection);

            if (typeof widget.endUserOptions.source !== 'undefined') {
                if (typeof widget.endUserOptions.lookAt !== 'undefined') {
                    widget.loadCzml(widget.endUserOptions.source, widget.endUserOptions.lookAt);
                } else {
                    widget.loadCzml(widget.endUserOptions.source);
                }
            }

            if (typeof widget.endUserOptions.stats !== 'undefined' && widget.endUserOptions.stats) {
                widget.enableStatistics(true);
            }

            this._lastTimeLabelClock = clock.currentTime;
            this._lastTimeLabelDate = Date.now();
            this.timeLabelElement = this.timeLabel.containerNode;
            this.timeLabelElement.innerHTML = clock.currentTime.toDate().toUTCString();

            var animReverse = this.animReverse;
            var animPause = this.animPause;
            var animPlay = this.animPlay;

            on(this.animReset, 'Click', function() {
                animationController.reset();
                animReverse.set('checked', false);
                animPause.set('checked', true);
                animPlay.set('checked', false);
            });

            function onAnimPause() {
                animationController.pause();
                animReverse.set('checked', false);
                animPause.set('checked', true);
                animPlay.set('checked', false);
            }

            on(animPause, 'Click', onAnimPause);

            on(animReverse, 'Click', function() {
                animationController.playReverse();
                animReverse.set('checked', true);
                animPause.set('checked', false);
                animPlay.set('checked', false);
            });

            on(animPlay, 'Click', function() {
                animationController.play();
                animReverse.set('checked', false);
                animPause.set('checked', false);
                animPlay.set('checked', true);
            });

            on(widget.animSlow, 'Click', function() {
                animationController.slower();
            });

            on(widget.animFast, 'Click', function() {
                animationController.faster();
            });

            function onTimelineScrub(e) {
                widget.clock.currentTime = e.timeJulian;
                onAnimPause();
            }

            var timelineWidget = widget.timelineWidget;
            timelineWidget.clock = widget.clock;
            timelineWidget.setupCallback = function(t) {
                widget.timelineControl = t;
                t.addEventListener('settime', onTimelineScrub, false);
                t.zoomTo(clock.startTime, clock.stopTime);
            };
            timelineWidget.setupTimeline();

            var viewHomeButton = widget.viewHomeButton;
            var view2D = widget.view2D;
            var view3D = widget.view3D;
            var viewColumbus = widget.viewColumbus;
            var viewFullscreen = widget.viewFullscreen;

            view2D.set('checked', false);
            view3D.set('checked', true);
            viewColumbus.set('checked', false);

            if (Fullscreen.isFullscreenEnabled()) {
                on(document, Fullscreen.getFullscreenChangeEventName(), function() {
                    widget.resize();
                });

                on(viewFullscreen, 'Click', function() {
                    if (Fullscreen.isFullscreen()) {
                        Fullscreen.exitFullscreen();
                    } else {
                        Fullscreen.requestFullscreen(defaultValue(widget.fullscreenElement, widget.cesiumNode));
                    }
                });
            } else {
                domStyle.set(viewFullscreen.domNode, 'display', 'none');
            }

            on(viewHomeButton, 'Click', function() {
                widget.viewHome();
            });
            on(view2D, 'Click', function() {
                view2D.set('checked', true);
                view3D.set('checked', false);
                viewColumbus.set('checked', false);
                transitioner.morphTo2D();
            });
            on(view3D, 'Click', function() {
                view2D.set('checked', false);
                view3D.set('checked', true);
                viewColumbus.set('checked', false);
                transitioner.morphTo3D();
            });
            on(viewColumbus, 'Click', function() {
                view2D.set('checked', false);
                view3D.set('checked', false);
                viewColumbus.set('checked', true);
                transitioner.morphToColumbusView();
            });

            var imagery = widget.imagery;
            var imageryAerial = widget.imageryAerial;
            var imageryAerialWithLabels = widget.imageryAerialWithLabels;
            var imageryRoad = widget.imageryRoad;
            var imagerySingleTile = widget.imagerySingleTile;
            var imageryOptions = [imageryAerial, imageryAerialWithLabels, imageryRoad, imagerySingleTile];
            var bingHtml = imagery.containerNode.innerHTML;

            imagery.startup();

            function createImageryClickFunction(control, style) {
                return function() {
                    if (style) {
                        widget.setStreamingImageryMapStyle(style);
                        imagery.containerNode.innerHTML = bingHtml;
                    } else {
                        widget.enableStreamingImagery(false);
                        imagery.containerNode.innerHTML = 'Imagery';
                    }

                    imageryOptions.forEach(function(o) {
                        o.set('checked', o === control);
                    });
                };
            }

            on(imageryAerial, 'Click', createImageryClickFunction(imageryAerial, BingMapsStyle.AERIAL));
            on(imageryAerialWithLabels, 'Click', createImageryClickFunction(imageryAerialWithLabels, BingMapsStyle.AERIAL_WITH_LABELS));
            on(imageryRoad, 'Click', createImageryClickFunction(imageryRoad, BingMapsStyle.ROAD));
            on(imagerySingleTile, 'Click', createImageryClickFunction(imagerySingleTile, undefined));

            //////////////////////////////////////////////////////////////////////////////////////////////////

            if (widget.resizeWidgetOnWindowResize) {
                on(window, 'resize', function() {
                    widget.resize();
                });
            }

            this._camera3D = this.scene.getCamera().clone();

            if (this.autoStartRenderLoop) {
                this.startRenderLoop();
            }
        },

        /**
         * Reset the camera to the home view for the current scene mode.
         * @function
         * @memberof CesiumViewerWidget.prototype
         */
        viewHome : function() {
            this._viewFromTo = undefined;

            var scene = this.scene;
            var mode = scene.mode;

            var camera = scene.getCamera();
            camera.controller.constrainedAxis = undefined;

            var controller = scene.getScreenSpaceCameraController();
            controller.enableTranslate = true;
            controller.enableTilt = true;
            controller.setEllipsoid(Ellipsoid.WGS84);
            controller.columbusViewMode = CameraColumbusViewMode.FREE;

            if (mode === SceneMode.SCENE2D) {
                camera.controller.viewExtent(Extent.MAX_VALUE);
            } else if (mode === SceneMode.SCENE3D) {
                var camera3D = this._camera3D;
                camera3D.position.clone(camera.position);
                camera3D.direction.clone(camera.direction);
                camera3D.up.clone(camera.up);
                camera3D.right.clone(camera.right);
                camera3D.transform.clone(camera.transform);
                camera3D.frustum.clone(camera.frustum);
            } else if (mode === SceneMode.COLUMBUS_VIEW) {
                var transform = new Matrix4(0.0, 0.0, 1.0, 0.0,
                                            1.0, 0.0, 0.0, 0.0,
                                            0.0, 1.0, 0.0, 0.0,
                                            0.0, 0.0, 0.0, 1.0);

                var maxRadii = Ellipsoid.WGS84.getMaximumRadius();
                var position = new Cartesian3(0.0, -1.0, 1.0).normalize().multiplyByScalar(5.0 * maxRadii);
                var direction = Cartesian3.ZERO.subtract(position).normalize();
                var right = direction.cross(Cartesian3.UNIT_Z);
                var up = right.cross(direction);
                right = direction.cross(up);
                direction = up.cross(right);

                var frustum = new PerspectiveFrustum();
                frustum.fovy = CesiumMath.toRadians(60.0);
                frustum.aspectRatio = this.canvas.clientWidth / this.canvas.clientHeight;

                camera.position = position;
                camera.direction = direction;
                camera.up = up;
                camera.right = right;
                camera.frustum = frustum;
                camera.transform = transform;
            }
        },

        /**
         * Enable or disable the FPS (Frames Per Second) perfomance display.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Boolean} showStatistics - <code>true</code> to enable it.
         */
        enableStatistics : function(showStatistics) {
            if (typeof this._performanceDisplay === 'undefined' && showStatistics) {
                this._performanceDisplay = new PerformanceDisplay();
                this.scene.getPrimitives().add(this._performanceDisplay);
            } else if (typeof this._performanceDisplay !== 'undefined' && !showStatistics) {
                this.scene.getPrimitives().remove(this._performanceDisplay);
                this._performanceDisplay = undefined;
            }
        },

        /**
         * Enable or disable the "sky atmosphere" effect, which displays the limb
         * of the Earth (seen from space) or blue sky (seen from inside the atmosphere).
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Boolean} show - <code>true</code> to enable the effect.
         */
        showSkyAtmosphere : function(show) {
            this.scene.skyAtmosphere.show = show;
        },

        /**
         * Enable or disable streaming imagery, and update the globe.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Boolean} value - <code>true</code> to enable streaming imagery.
         * @see CesiumViewerWidget#useStreamingImagery
         */
        enableStreamingImagery : function(value) {
            this.useStreamingImagery = value;
            this._configureCentralBodyImagery();
        },

        /**
         * Change the streaming imagery type, and update the globe.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {BingMapsStyle} value - the new map style to use.
         * @see CesiumViewerWidget#mapStyle
         */
        setStreamingImageryMapStyle : function(value) {
            if (!this.useStreamingImagery || this.mapStyle !== value) {
                this.useStreamingImagery = true;
                this.mapStyle = value;
                this._configureCentralBodyImagery();
            }
        },

        /**
         * Set the positional offset of the logo of the streaming imagery provider.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Integer} logoOffsetX - The horizontal offset in screen space
         * @param {Integer} logoOffsetY - The vertical offset in screen space
         */
        setLogoOffset : function(logoOffsetX, logoOffsetY) {
            var logoOffset = this.centralBody.logoOffset;
            if ((logoOffsetX !== logoOffset.x) || (logoOffsetY !== logoOffset.y)) {
                this.centralBody.logoOffset = new Cartesian2(logoOffsetX, logoOffsetY);
            }
        },

        /**
         * Highlight an object in the scene, usually in response to a click or hover.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Object} selectedObject - The object to highlight, or <code>undefined</code> to un-highlight.
         */
        highlightObject : function(selectedObject) {
            if (this.highlightedObject !== selectedObject) {
                if (typeof this.highlightedObject !== 'undefined' &&
                        (typeof this.highlightedObject.isDestroyed !== 'function' || !this.highlightedObject.isDestroyed())) {
                    if (typeof this.highlightedObject.material !== 'undefined') {
                        this.highlightedObject.material = this._originalMaterial;
                    } else if (typeof this.highlightedObject.outerMaterial !== 'undefined') {
                        this.highlightedObject.outerMaterial = this._originalMaterial;
                    } else if (typeof this.highlightedObject.setColor !== 'undefined') {
                        this.highlightedObject.setColor(this._originalColor);
                    }
                }
                this.highlightedObject = selectedObject;
                if (typeof selectedObject !== 'undefined') {
                    if (typeof selectedObject.material !== 'undefined') {
                        this._originalMaterial = selectedObject.material;
                        selectedObject.material = this.highlightMaterial;
                    } else if (typeof selectedObject.outerMaterial !== 'undefined') {
                        this._originalMaterial = selectedObject.outerMaterial;
                        selectedObject.outerMaterial = this.highlightMaterial;
                    } else if (typeof this.highlightedObject.setColor !== 'undefined') {
                        this._originalColor = Color.clone(selectedObject.getColor(), this._originalColor);
                        selectedObject.setColor(this.highlightColor);
                    }
                }
            }
        },

        /**
         * Initialize the current frame.
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {JulianDate} currentTime - The date and time in the scene of the frame to be rendered
         */
        initializeFrame : function(currentTime) {
            this.scene.initializeFrame(currentTime);
        },

        /**
         * Call this function prior to rendering each animation frame, to prepare
         * all CZML objects and other settings for the next frame.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {JulianDate} currentTime - The date and time in the scene of the frame to be rendered
         */
        update : function(currentTime) {

            this._updateSpeedIndicator();
            this.timelineControl.updateFromClock();
            this.visualizers.update(currentTime);

            if ((Math.abs(currentTime.getSecondsDifference(this._lastTimeLabelClock)) >= 1.0) ||
                    ((Date.now() - this._lastTimeLabelDate) > 200)) {
                this.timeLabelElement.innerHTML = currentTime.toDate().toUTCString();
                this._lastTimeLabelClock = currentTime;
                this._lastTimeLabelDate = Date.now();
            }

            // Update the camera to stay centered on the selected object, if any.
            var viewFromTo = this._viewFromTo;
            if (typeof viewFromTo !== 'undefined') {
                viewFromTo.update(currentTime);
            }
        },

        /**
         * Render the widget's scene.
         * @function
         * @memberof CesiumViewerWidget.prototype
         */
        render : function() {
            this.scene.render();
        },

        _configureCentralBodyImagery : function() {
            var centralBody = this.centralBody;

            var imageLayers = centralBody.getImageryLayers();

            var existingImagery;
            if (imageLayers.getLength() !== 0) {
                existingImagery = imageLayers.get(0).imageryProvider;
            }

            var newLayer;

            if (this.useStreamingImagery) {
                if (!(existingImagery instanceof BingMapsImageryProvider) ||
                    existingImagery.getMapStyle() !== this.mapStyle) {

                    newLayer = imageLayers.addImageryProvider(new BingMapsImageryProvider({
                        server : 'dev.virtualearth.net',
                        mapStyle : this.mapStyle,
                        // Some versions of Safari support WebGL, but don't correctly implement
                        // cross-origin image loading, so we need to load Bing imagery using a proxy.
                        proxy : FeatureDetection.supportsCrossOriginImagery() ? undefined : new DefaultProxy('/proxy/')
                    }));
                    if (imageLayers.getLength() > 1) {
                        imageLayers.remove(imageLayers.get(0));
                    }
                    imageLayers.lowerToBottom(newLayer);
                }
            } else {
                if (!(existingImagery instanceof SingleTileImageryProvider) ||
                    existingImagery.getUrl() !== this.dayImageUrl) {

                    newLayer = imageLayers.addImageryProvider(new SingleTileImageryProvider({url : this.dayImageUrl}));
                    if (imageLayers.getLength() > 1) {
                        imageLayers.remove(imageLayers.get(0));
                    }
                    imageLayers.lowerToBottom(newLayer);
                }
            }
        },

        /**
         * If true, {@link CesiumViewerWidget#startRenderLoop} will be called automatically
         * at the end of {@link CesiumViewerWidget#startup}.
         *
         * @type {Boolean}
         * @memberof CesiumViewerWidget.prototype
         * @default true
         */
        autoStartRenderLoop : true,

        /**
         * This is a simple render loop that can be started if there is only one <code>CesiumViewerWidget</code>
         * on your page.  If you wish to customize your render loop, avoid this function and instead
         * use code similar to one of the following examples.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @see requestAnimationFrame
         * @see CesiumViewerWidget#autoStartRenderLoop
         * @example
         * // This takes the place of startRenderLoop for a single widget.
         *
         * var animationController = widget.animationController;
         * function updateAndRender() {
         *     var currentTime = animationController.update();
         *     widget.initializeFrame(currentTime);
         *     widget.update(currentTime);
         *     widget.render();
         *     requestAnimationFrame(updateAndRender);
         * }
         * requestAnimationFrame(updateAndRender);
         * @example
         * // This example requires widget1 and widget2 to share an animationController
         * // (for example, widget2's constructor was called with a copy of widget1's
         * // animationController).
         *
         * function updateAndRender() {
         *     var currentTime = animationController.update();
         *     widget1.initializeFrame(currentTime);
         *     widget2.initializeFrame(currentTime);
         *     widget1.update(currentTime);
         *     widget2.update(currentTime);
         *     widget1.render();
         *     widget2.render();
         *     requestAnimationFrame(updateAndRender);
         * }
         * requestAnimationFrame(updateAndRender);
         * @example
         * // This example uses separate animationControllers for widget1 and widget2.
         * // These widgets can animate at different rates and pause individually.
         *
         * function updateAndRender() {
         *     var time1 = widget1.animationController.update();
         *     var time2 = widget2.animationController.update();
         *     widget1.initializeFrame(time1);
         *     widget2.initializeFrame(time2);
         *     widget1.update(time1);
         *     widget2.update(time2);
<<<<<<< HEAD
         *     widget1.render();
         *     widget2.render();
=======
         *     widget1.render(time1);
         *     widget2.render(time2);
>>>>>>> origin/terrainAndOcean
         *     requestAnimationFrame(updateAndRender);
         * }
         * requestAnimationFrame(updateAndRender);
         */
        startRenderLoop : function() {
            var widget = this;
            var animationController = widget.animationController;

            function updateAndRender() {
                var currentTime = animationController.update();
                widget.initializeFrame(currentTime);
                widget.update(currentTime);
                widget.render();
                requestAnimationFrame(updateAndRender);
            }

            requestAnimationFrame(updateAndRender);
        }
    });
});
