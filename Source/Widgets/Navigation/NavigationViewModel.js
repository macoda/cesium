/*global define*/
define([
        '../../Core/defineProperties',
        '../../Core/DeveloperError',
        '../createCommand',
        '../ToggleButtonViewModel',
        '../../ThirdParty/sprintf',
        '../../ThirdParty/knockout'
    ], function(
        defineProperties,
        DeveloperError,
        createCommand,
        ToggleButtonViewModel,
        sprintf,
        knockout) {
    "use strict";

    var maxZoomRingAngle = 100;

    var NavigationViewModel = function() {

        this.zoomRingAngle = 0;
        knockout.defineProperty(this, 'zoomRingAngle', {
            get : function () {
                return this.zoomRingAngle;
            },
            set : function (angle) {

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

    return NavigationViewModel;
});