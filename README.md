# odyssey-generate
Generate an Odyssey Story Map from a CartoDB Map.

## Prerequisite
A CartoDB map (go create one, it's easy!)  http://cartodb.com/

## Steps
Just download the index.html and edit the following

``` 
-title: "Enter a title"
-author: "Enter an author"
-vizjson: "Copy vizjson url here from CartoDB map"
-description: "Enter description here"
-slideTitle: "Enter cartodb field name for slide title"
-fields: "Enter cartodb field name for slide text"
-image: "Enter cartodb field name for image (Optional)"
-baseurl: "Enter base map url here (Optional)"
``` 

#### See example folder for this working example
http://bl.ocks.org/scottlepp/raw/909f190d01be2566115c/

#### Note
Interaction with the map (clicking points) is also linked to the slides providing an additional way to nagivate the tour.
