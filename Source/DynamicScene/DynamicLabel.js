/*global define*/
define([
        '../Core/TimeInterval',
        '../Core/defaultValue',
        '../Core/defined',
        './CzmlBoolean',
        './CzmlCartesian2',
        './CzmlCartesian3',
        './CzmlNumber',
        './CzmlString',
        './CzmlHorizontalOrigin',
        './CzmlVerticalOrigin',
        './CzmlLabelStyle',
        './CzmlColor',
        './DynamicProperty'
       ], function(
        TimeInterval,
        defaultValue,
        defined,
        CzmlBoolean,
        CzmlCartesian2,
        CzmlCartesian3,
        CzmlNumber,
        CzmlString,
        CzmlHorizontalOrigin,
        CzmlVerticalOrigin,
        CzmlLabelStyle,
        CzmlColor,
        DynamicProperty) {
    "use strict";

    /**
     * Represents a time-dynamic label, typically used in conjunction with DynamicLabelVisualizer and
     * DynamicObjectCollection to visualize CZML.
     *
     * @alias DynamicLabel
     * @constructor
     *
     * @see DynamicObject
     * @see DynamicProperty
     * @see DynamicObjectCollection
     * @see DynamicLabelVisualizer
     * @see VisualizerCollection
     * @see Label
     * @see LabelCollection
     * @see CzmlDefaults
     */
    var DynamicLabel = function() {
        /**
         * A DynamicProperty of type CzmlString which determines the label's text.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.text = undefined;
        /**
         * A DynamicProperty of type CzmlString which determines the label's font.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.font = undefined;
        /**
         * A DynamicProperty of type CzmlLabelStyle which determines the label's style.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.style = undefined;
        /**
         * A DynamicProperty of type CzmlColor which determines the label's fill color.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.fillColor = undefined;
        /**
         * A DynamicProperty of type CzmlColor which determines the label's outline color.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.outlineColor = undefined;
        /**
         * A DynamicProperty of type CzmlNumber which determines the label's outline width.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.outlineWidth = undefined;
        /**
         * A DynamicProperty of type CzmlHorizontalOrigin which determines the label's horizontal origin.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.horizontalOrigin = undefined;
        /**
         * A DynamicProperty of type CzmlVerticalOrigin which determines the label's vertical origin.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.verticalOrigin = undefined;
        /**
         * A DynamicProperty of type CzmlCartesian3 which determines the label's eye offset.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.eyeOffset = undefined;
        /**
         * A DynamicProperty of type CzmlCartesian2 which determines the label's pixel offset.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.pixelOffset = undefined;
        /**
         * A DynamicProperty of type CzmlNumber which determines the label's scale.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.scale = undefined;
        /**
         * A DynamicProperty of type CzmlBoolean which determines the label's visibility.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.show = undefined;
    };

    /**
     * Processes a single CZML packet and merges its data into the provided DynamicObject's label.
     * If the DynamicObject does not have a label, one is created.  This method is not
     * normally called directly, but is part of the array of CZML processing functions that is
     * passed into the DynamicObjectCollection constructor.
     *
     * @param {DynamicObject} dynamicObject The DynamicObject which will contain the label data.
     * @param {Object} packet The CZML packet to process.
     * @returns {Boolean} true if any new properties were created while processing the packet, false otherwise.
     *
     * @see DynamicObject
     * @see DynamicProperty
     * @see DynamicObjectCollection
     * @see CzmlDefaults#updaters
     */
    DynamicLabel.processCzmlPacket = function(dynamicObject, packet) {
        var labelData = packet.label;
        if (!defined(labelData)) {
            return false;
        }

        var labelUpdated = false;
        var label = dynamicObject.label;
        labelUpdated = !defined(label);
        if (labelUpdated) {
            dynamicObject.label = label = new DynamicLabel();
        }

        var interval = labelData.interval;
        if (defined(interval)) {
            interval = TimeInterval.fromIso8601(interval);
        }

        if (defined(labelData.fillColor)) {
            var fillColor = label.fillColor;
            if (!defined(fillColor)) {
                label.fillColor = fillColor = new DynamicProperty(CzmlColor);
                labelUpdated = true;
            }
            fillColor.processCzmlIntervals(labelData.fillColor, interval);
        }

        if (defined(labelData.outlineColor)) {
            var outlineColor = label.outlineColor;
            if (!defined(outlineColor)) {
                label.outlineColor = outlineColor = new DynamicProperty(CzmlColor);
                labelUpdated = true;
            }
            outlineColor.processCzmlIntervals(labelData.outlineColor, interval);
        }

        if (defined(labelData.outlineWidth)) {
            var outlineWidth = label.outlineWidth;
            if (!defined(outlineWidth)) {
                label.outlineWidth = outlineWidth = new DynamicProperty(CzmlNumber);
                labelUpdated = true;
            }
            outlineWidth.processCzmlIntervals(labelData.outlineWidth, interval);
        }

        if (defined(labelData.eyeOffset)) {
            var eyeOffset = label.eyeOffset;
            if (!defined(eyeOffset)) {
                label.eyeOffset = eyeOffset = new DynamicProperty(CzmlCartesian3);
                labelUpdated = true;
            }
            eyeOffset.processCzmlIntervals(labelData.eyeOffset, interval);
        }

        if (defined(labelData.horizontalOrigin)) {
            var horizontalOrigin = label.horizontalOrigin;
            if (!defined(horizontalOrigin)) {
                label.horizontalOrigin = horizontalOrigin = new DynamicProperty(CzmlHorizontalOrigin);
                labelUpdated = true;
            }
            horizontalOrigin.processCzmlIntervals(labelData.horizontalOrigin, interval);
        }

        if (defined(labelData.text)) {
            var text = label.text;
            if (!defined(text)) {
                label.text = text = new DynamicProperty(CzmlString);
                labelUpdated = true;
            }
            text.processCzmlIntervals(labelData.text, interval);
        }

        if (defined(labelData.pixelOffset)) {
            var pixelOffset = label.pixelOffset;
            if (!defined(pixelOffset)) {
                label.pixelOffset = pixelOffset = new DynamicProperty(CzmlCartesian2);
                labelUpdated = true;
            }
            pixelOffset.processCzmlIntervals(labelData.pixelOffset, interval);
        }

        if (defined(labelData.scale)) {
            var scale = label.scale;
            if (!defined(scale)) {
                label.scale = scale = new DynamicProperty(CzmlNumber);
                labelUpdated = true;
            }
            scale.processCzmlIntervals(labelData.scale, interval);
        }

        if (defined(labelData.show)) {
            var show = label.show;
            if (!defined(show)) {
                label.show = show = new DynamicProperty(CzmlBoolean);
                labelUpdated = true;
            }
            show.processCzmlIntervals(labelData.show, interval);
        }

        if (defined(labelData.verticalOrigin)) {
            var verticalOrigin = label.verticalOrigin;
            if (!defined(verticalOrigin)) {
                label.verticalOrigin = verticalOrigin = new DynamicProperty(CzmlVerticalOrigin);
                labelUpdated = true;
            }
            verticalOrigin.processCzmlIntervals(labelData.verticalOrigin, interval);
        }

        if (defined(labelData.font)) {
            var font = label.font;
            if (!defined(font)) {
                label.font = font = new DynamicProperty(CzmlString);
                labelUpdated = true;
            }
            font.processCzmlIntervals(labelData.font, interval);
        }

        if (defined(labelData.style)) {
            var style = label.style;
            if (!defined(style)) {
                label.style = style = new DynamicProperty(CzmlLabelStyle);
                labelUpdated = true;
            }
            style.processCzmlIntervals(labelData.style, interval);
        }
        return labelUpdated;
    };

    /**
     * Given two DynamicObjects, takes the label properties from the second
     * and assigns them to the first, assuming such a property did not already exist.
     * This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the CompositeDynamicObjectCollection constructor.
     *
     * @param {DynamicObject} targetObject The DynamicObject which will have properties merged onto it.
     * @param {DynamicObject} objectToMerge The DynamicObject containing properties to be merged.
     *
     * @see CzmlDefaults
     */
    DynamicLabel.mergeProperties = function(targetObject, objectToMerge) {
        var labelToMerge = objectToMerge.label;
        if (defined(labelToMerge)) {

            var targetLabel = targetObject.label;
            if (!defined(targetLabel)) {
                targetObject.label = targetLabel = new DynamicLabel();
            }

            targetLabel.text = defaultValue(targetLabel.text, labelToMerge.text);
            targetLabel.font = defaultValue(targetLabel.font, labelToMerge.font);
            targetLabel.show = defaultValue(targetLabel.show, labelToMerge.show);
            targetLabel.style = defaultValue(targetLabel.style, labelToMerge.style);
            targetLabel.fillColor = defaultValue(targetLabel.fillColor, labelToMerge.fillColor);
            targetLabel.outlineColor = defaultValue(targetLabel.outlineColor, labelToMerge.outlineColor);
            targetLabel.outlineWidth = defaultValue(targetLabel.outlineWidth, labelToMerge.outlineWidth);
            targetLabel.scale = defaultValue(targetLabel.scale, labelToMerge.scale);
            targetLabel.horizontalOrigin = defaultValue(targetLabel.horizontalOrigin, labelToMerge.horizontalOrigin);
            targetLabel.verticalOrigin = defaultValue(targetLabel.verticalOrigin, labelToMerge.verticalOrigin);
            targetLabel.eyeOffset = defaultValue(targetLabel.eyeOffset, labelToMerge.eyeOffset);
            targetLabel.pixelOffset = defaultValue(targetLabel.pixelOffset, labelToMerge.pixelOffset);
        }
    };

    /**
     * Given a DynamicObject, undefines the label associated with it.
     * This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the CompositeDynamicObjectCollection constructor.
     *
     * @param {DynamicObject} dynamicObject The DynamicObject to remove the label from.
     *
     * @see CzmlDefaults
     */
    DynamicLabel.undefineProperties = function(dynamicObject) {
        dynamicObject.label = undefined;
    };

    return DynamicLabel;
});
