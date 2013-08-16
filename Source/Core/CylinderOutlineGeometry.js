/*global define*/
define([
        './defaultValue',
        './defined',
        './DeveloperError',
        './Cartesian2',
        './Cartesian3',
        './CylinderGeometryLibrary',
        './Math',
        './ComponentDatatype',
        './IndexDatatype',
        './PrimitiveType',
        './BoundingSphere',
        './GeometryAttribute',
        './GeometryAttributes'
    ], function(
        defaultValue,
        defined,
        DeveloperError,
        Cartesian2,
        Cartesian3,
        CylinderGeometryLibrary,
        CesiumMath,
        ComponentDatatype,
        IndexDatatype,
        PrimitiveType,
        BoundingSphere,
        GeometryAttribute,
        GeometryAttributes) {
    "use strict";

    var radiusScratch = new Cartesian2();

    /**
     * A {@link Geometry} that represents vertices and indices for the outline of a cylinder.
     *
     * @alias CylinderGeometryOutline
     * @constructor
     *
     * @param {Number} options.length The length of the cylinder.
     * @param {Number} options.topRadius The radius of the top of the cylinder.
     * @param {Number} options.bottomRadius The radius of the bottom of the cylinder.
     * @param {Number} [options.slices = 128] The number of edges around perimeter of the cylinder.
     * @param {Number} [options.numberOfVerticalLines = 16] Number of lines to draw between the top and bottom surfaces of the cylinder.
     *
     * @exception {DeveloperError} options.length must be greater than 0.
     * @exception {DeveloperError} options.topRadius must be greater than 0.
     * @exception {DeveloperError} options.bottomRadius must be greater than 0.
     * @exception {DeveloperError} bottomRadius and topRadius cannot both equal 0.
     * @exception {DeveloperError} options.slices must be greater that 3.
     *
     * @example
     * // create cylinder geometry
     * var cylinder = new Cesium.CylinderGeometryOutline({
     *     length: 200000,
     *     topRadius: 80000,
     *     bottomRadius: 200000,
     * });
     *
     */
    var CylinderGeometryOutline = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var length = options.length;
        if (!defined(length) || length <= 0) {
            throw new DeveloperError('options.length must be greater than 0.');
        }
        var topRadius = options.topRadius;
        if (!defined(topRadius) || topRadius < 0) {
            throw new DeveloperError('options.topRadius must be greater than 0.');
        }
        var bottomRadius = options.bottomRadius;
        if (!defined(bottomRadius) || bottomRadius < 0) {
            throw new DeveloperError('options.bottomRadius must be greater than 0.');
        }
        if (bottomRadius === 0 && topRadius === 0) {
            throw new DeveloperError('bottomRadius and topRadius cannot both equal 0.');
        }

        var slices = defaultValue(options.slices, 128);
        if (slices < 3) {
            throw new DeveloperError('options.slices must be greater that 3.');
        }

        var numberOfVerticalLines = Math.max(defaultValue(options.numberOfVerticalLines, 16), 0);

        var numVertices = slices * 2;

        var positions = CylinderGeometryLibrary.computePositions(options, slices);
        var numIndices = slices * 2;
        var numSide;
        if (numberOfVerticalLines > 0) {
            var numSideLines = Math.min(numberOfVerticalLines, slices);
            numSide = Math.round(slices/numSideLines);
            numIndices += numSideLines;
        }

        var indices = IndexDatatype.createTypedArray(numVertices, numIndices*2);
        var index = 0;
        for (var i = 0; i < slices-1; i++) {
            indices[index++] = i;
            indices[index++] = i+1;
            indices[index++] = i + slices;
            indices[index++] = i + 1 + slices;
        }
        indices[index++] = slices-1;
        indices[index++] = 0;
        indices[index++] = slices + slices - 1;
        indices[index++] = slices;

        if (numberOfVerticalLines > 0) {
            for (i = 0; i < slices; i+= numSide){
                indices[index++] = i;
                indices[index++] = i + slices;
            }
        }

        var attributes = new GeometryAttributes();
        attributes.position = new GeometryAttribute({
            componentDatatype: ComponentDatatype.DOUBLE,
            componentsPerAttribute: 3,
            values: positions
        });

        radiusScratch.x = length * 0.5;
        radiusScratch.y = Math.max(bottomRadius, topRadius);

        var boundingSphere = new BoundingSphere(Cartesian3.ZERO, radiusScratch.magnitude());

        /**
         * An object containing {@link GeometryAttribute} position property.
         *
         * @type Object
         *
         * @see Geometry#attributes
         */
        this.attributes = attributes;

        /**
         * Index data that, along with {@link Geometry#primitiveType}, determines the primitives in the geometry.
         *
         * @type Array
         */
        this.indices = indices;

        /**
         * The type of primitives in the geometry.  For this geometry, it is {@link PrimitiveType.LINES}.
         *
         * @type PrimitiveType
         */
        this.primitiveType = PrimitiveType.LINES;

        /**
         * A tight-fitting bounding sphere that encloses the vertices of the geometry.
         *
         * @type BoundingSphere
         */
        this.boundingSphere = boundingSphere;
    };

    return CylinderGeometryOutline;
});
