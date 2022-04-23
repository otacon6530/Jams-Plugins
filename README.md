# Mapper - Combined Maps for seamless player transfers

Combines 9 maps in order to allow seamless transfers between maps (Transfer not yet supported).

## Features:

Combines 9 square maps of the same size into one single map.
The center map events work throughout all maps.
Player start position is adjusted if the map is being combined.

## Upcoming:

Create transfer between maps for a seamless transfer.
Support rectangle maps
Support parallax maps

## How to setup:

Setup maps that a square and the same size.
add a line in the map note in the following format:
worldpos [world name] [x] [y]

Variables:

[world name] - Name of the group of maps that will be combined
[x] - the x position compared to the other maps
[y] - the y position compared to the other maps
Example:

worldpos Morrowind 0 1
