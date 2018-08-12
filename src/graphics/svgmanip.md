# SVG Manip

A component of TONES designed for somewhat simple SVG manipulation.

### This Page

The target audience of this page is Brandon, but I might consult it myself occasionally.

## Philosophy

1. Every node has a parent, which is a required parameter at creation.
2. A node's parent does not change.
3. Each node is assigned a unique* id.
4. When a node is destroyed all of its children are destroyed as well.
5. A node's tag does not change.

\* You can override this at your own peril.

## Introduction

### SVGElement

The SVG element is the base class of SVGGroup and thus SVGContext. It corresponds with a single element in the SVG.

An SVGGroup can be created in two ways, using the constructor or factory function. The former is like so:

```js
const svg = new TONES.SVGContext("svg-test"); // we'll get back to this

let elem = new TONES.SVGElement(svg, "rect");
```

The latter is like so:

```js
let elem = svg.addElement("rect");
```

You can set attributes of the element during construction, and set/get them after construction.

```js
let elem = new TONES.SVGElement(svg, "rect", {x: 10, y: 10, width: 100, height: 200});
// or
let elem = svg.addElement("rect", {x: 10, y: 10, width: 100, height: 200});

elem.set("fill", "#ffeedd");
console.log(elem.get("fill")); // -> "#ffeedd"
```

You can set multiple attributes at once, like so:

```js
elem.set("fill", "#fed").set("opacity", 0.5);
// or
elem.set({
  fill: "#fed",
  opacity: 0.5
});
```

For certain properties common to all elements, a getter/setter can be used. For example,

```js
elem.set("fill", "#abc");  // equivalent
elem.fill = "#abc";        //

elem.get("fill");          // equivalent
elem.fill;                 //
```

You can check whether an element has a property with *has*. For example,

```js
elem.fill = "#333";
elem.has("fill"); // true
elem.has("ian");  // false
```

An exhaustive list of these properties is given in the full description, but they include *fill*, *opacity*, *display*, *stroke*, *fontFamily*, and *fontSize*.

You can get the actual DOM element of an SVGElement in its *element* property. The SVGElement's parent is the property *parent*, and the context the element resides in is the property *context*.

To register event listeners, you can use *addEventListener* and *removeEventListener*, which just calls the function on the element internally. If you want to modify the event functions like *onclick* or *ondrag*, you can do

```js
elem.set("onclick", "console.log(4)");           // Clunky, function to call must be passed as text
// or
elem.element.onclick = (evt) => console.log(4);  // Somewhat more elegant
```

To add classes to an element, use *getClasses*, *addClass*, *removeClass*, and *hasClass*. *getClasses* returns an array of the element's classes, *addClass* takes a string or array of strings to add as a class, *removeClass* takes a string or array of class strings to remove, and *hasClass* checks whether an element has a class.

```js
elem.addClass(["john", "smith"]);
elem.getClasses();          // -> ["john", "smith"]
elem.removeClass("john");
elem.hasClass("john");      // -> false
elem.hasClass("smith");     // -> true
```

To transform an element, you can do `elem.set("transform", value)`, but a more robust method is to use SVG Manip's transform classes. In particular, each element is initialized with an empty Transformation instance, to which you can add transformations. The set of allowed transforms is described later, but here is an example of rotation and translation.

```js
let translation = new TONES.Translation(100, 100); // translation by (100, 100)
let rotation = new TONES.Rotation(20, 5, 5); // rotation by 20 degrees clockwise about (5, 5)
elem.addTransform([translation, rotation]);  // composite transformation will be translation, then rotation
elem.removeTransform(translation);           // remove the translation component
```

These functions internally call the corresponding function on the element's *transform* attribute, which contains the Transformation instance. When writing to the DOM, the transformation is converted into a single matrix transformation for convenience.

If you're done with an element, you can destroy it like so:

```js
elem.destroy();
// or
elem.remove(); // deprecated, for backwards compatibility
```

This will

* make it unusable,
* remove it from its parent's children,
* remove it from the DOM.

To find an element more easily, you can use the *highlight* function, which will create a translucent yellow rectangle on the element's current bounding box. You can turn off the highlight rectangle with *unhighlight*.

### SVGGroup

A group is a node with children. This is most often the SVG &lt;g&gt; group, but can also be tags like &lt;defs&gt; or &lt;linearGradient&gt; which have children, but are not SVG groups.

The SVGGroup, being a subclass of SVGElement, can be transformed and styled (styles will be applied to all child elements), and its nodes can be reordered.

An SVGGroup can be created in two ways, using the constructor or the factory function. The former is like so:

```js
const svg = new TONES.SVGContext("svg-test");

let group = new TONES.SVGGroup(svg);
```

The latter is like so:

```js
let group = svg.addGroup();
```

The group's tag is *g* by default, but can be specified in both these functions:

```js
let group = new TONES.SVGGroup(svg, "udder");
// or
let group = svg.addGroup("udder");
```

Of course, a group can have children. These are created like so:

```js
let group = svg.addGroup();
let rect = new TONES.SVGElement(group, "rect", {width: 100, height: 900});
let circ = group.addElement("circle", {r: 5, cx: 500, cy: 500});
```

`addGroup(tag = 'g', attribs = {})` takes a parameter *tag*, which is "g" be default, and a dictionary of attributes to initialize the group with. There is also `addElement(tag, attribs = {})`.

A group's children is stored in the children array. For example, you could print all a group's direct children (i.e. only one level down) like so:

```js
let group = svg.addGroup();
group.children.forEach(console.log);
```

The order of the children in the array corresponds with the order they are in the DOM, and therefore their order of drawing, unless you mess with the array directly.

You can go over all a group's children, including its children's children and so forth, with *traverseNodes*. This method takes a function *f* as its first parameter and calls `f(node, index)` on each child. The  For example,

```js
let group = svg.addGroup();
let rect = new TONES.SVGElement(group, 'rect');
let subgroup = new TONES.SVGGroup(group);
let circ = new TONES.SVGElement(subgroup, 'circle');
let cow = new TONES.SVGElement(subgroup, 'rect');
group.traverseNodes(console.log); // calls func on rect, subgroup, circ, cow
```

If you only want "leaf" elements, i.e. SVGElement instances, not SVGGroup, you can do

```js
group.traverseNodes(console.log, true /* is recursive */, true /* only call on leaf elements */);
```

Note that groups without children do count as "leaf" elements, so they will be called.

To remove children from the group, you can of course call destroy() on each child you want to destroy, or you can use *destroyIf*.

```js
group.destroyIf((child) => child.tag === "rect", true); // removes all rect elements, recursively
group.destroyIf((child) => child.tag === "circle", false); // removes all circle elements, but only one level deep
group.destroyIf(() => true); // removes all children
```

To test if an element is the child of some potential parent, use *isChild*:

```js
let group = svg.addGroup();
let rect = new TONES.SVGElement(group, 'rect');
let subgroup = new TONES.SVGGroup(group);
let cow = new TONES.SVGElement(subgroup, 'rect');

subgroup.isChild(cow); // -> true
group.isChild(cow, false /* is direct child? */); // -> false
group.isChild(cow); // -> true
subgroup.isChild(rect); // -> false
```

To move around children in groups, there exist several utility functions. The order of `group.children` should always match `group.element.children`, unless you mess around with the children array; you can correct the order, based on the order of `group.children`, with `group.updateElementOrder()`.

To swap two children's places, use *swap*. It takes two arguments, either the index of or the child itself for each. For example,

```js
let group = svg.addGroup();
let rect = new TONES.SVGElement(group, 'rect');
let subgroup = new TONES.SVGGroup(group);

group.swap(0, 1);           //
group.swap(rect, 0);        // swaps rect and subgroup
group.swap(rect, subgroup); //
```

To move a certain element to a specific location, use *moveAfter* and *moveBefore*. They take two arguments, first the index of or element to be moved, the second the index of or element to be used as a reference location. *moveAfter* puts the former after the latter, keeping the latter in place; *moveBefore* puts the former before the latter, keeping the latter in place.

There are also some simple functions *sendBack* and *bringFront*, which move the element/index to the back or front. For convenience, you can call *sendToBack* and *bringToFront* with no arguments on a child to move it in the parent's order.

You can sort children by a function with *sort*. For example, this function sorts the children alphabetically by tag name:

```js
group.sort((x, y) => {
  let tag_x = x.tag.toLowerCase(), tag_y = y.tag.toLowerCase();

  if (tag_x > tag_y)
    return 1;
  else if (tag_x < tag_y)
    return -1;
  else
    return 0;
})
```

### SVGContext

A context is required for drawing to an SVG. It is the top-level controller of drawing on an SVG element.

An SVGContext is a subclass of *SVGGroup*, which is in turn a subclass of *SVGElement*, so you can use any of those class's methods on an SVGContext. The context's associated DOM element is the SVG element itself. An SVGContext has no parent, though, so certain operations will fail.

In its simplest form, creating a context can be done like so:

```html
<body>
    <svg id="svg-test" width="400" height="200"></svg>
    <script>
        const svg = new TONES.SVGContext("svg-test");
        // or
        const svg = new TONES.SVGContext(document.getElementById("svg-test"));
    </script>
</body>
```

Note that either the DOM element itself or its id can be passed to the constructor. The context is the property *context* of any child SVGGroup or SVGElement.

### Transformations

By default each SVGElement is created with a Transformation in *element.transform*, along with aliases for functions like *addTransform*, *removeTransform*, *applyTransform*, *applyInverseTransform*, which are kept for compatibility with Score. The transformation can be used without a parent class, though.

A transformation is composed of a series of SimpleTransformations, each of which correspond with a standard SVG transformation. These are:

* Translation(x = 0, y = 0), a translation by (x, y)
* ScaleTransform(x = 1, y = x), a scale by x in the x-axis and y in the y-axis, about the origin
* Rotation(deg = 0, x = 0, y = 0), a rotation by deg degrees clockwise, about the point (x, y)
* SkewX(deg = 0), a skew by deg degrees in the x-axis
* SkewY(deg = 0), a skew by deg degrees in the y-axis
* MatrixTransform(a = 1, b = 0, c = 0, d = 1, e = 0, f = 0), a general transformation explained later.

All these transformations are subclasses of SimpleTransformation. Here is an example of the main features in action:

```js
let transform = new TONES.Transformation();
let translation = new TONES.Translation(10, 10);

transform.add(new TONES.Rotation(10)); // first rotate 10 degrees clockwise
transform.add(translation); // translate by (10, 10)

transform.transform(3, 4); // -> [10.37142562866211, 16.04473489522934], the result of the transformation on the given point
transform.inverse(10.37142562866211, 16.04473489522934); // -> [2.9999999749181647, 4.0000005782732835], the result of the transformation's inverse on the given point
translation.transform(3, 4); // -> [13, 14]
translation.inverse(13, 14); // -> [3, 4]

transform.removeIf(trans => trans instanceof TONES.Rotation); // -> remove all rotations
transform.remove(translation); // -> remove the translation
```

Interestingly, any series of those SimpleTransformations, including MatrixTransforms, can be represented by a single MatrixTransform. When writing the transform property to the DOM element, the transformation is converted to a single matrix first, then written. You can get this matrix, which is an instance of TONES.TMatrix, with *transformation.matrix*.

When modifying an element's transform, any modification to the transform will automatically update the element.

<!--- ## Classes

### SVGContext

#### Methods

##### constructor

`constructor(domElem)`

###### arguments

* *domElem*: SVG element or its string id

#### Properties

##### get/set width

The width of the SVG.

##### get/set height

The height of the SVG. -->
