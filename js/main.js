!(function(){
	"use strict"
	// SVG canvas size
		var width, height 
		var chartWidth, chartHeight
		var margin
		var svg = d3.select("#graph").append("svg")
		var chartLayer = svg.append("g").classed("chartLayer", true)
	// Colors
		const nodesColor = "#8f1f96de"
		const nodesColors = ["#0000ffde", "#008000de", "#ffff00de", "#a52a2ade"]
		const nodesOverColors = ["#8f1f96", "#0000ff", "#008000", "#ffff00", "#a52a2a"]
		var nodesMouseOverFillColor = "#467fffc9"
		var nodesMouseOverNeighborsFillColor = "#00afb7bf"

	var globalData = {} // Data json object
	var foundCliques = [] // Max cliques array
	var neighborhoodLengths = [] // For neighborhood node lengths
	// Makes an array of consecutive numbers on a range
	// const arrayRange = (start, stop, step) => Array.from({ length: (stop - start) / step + 1}, (_, i) => start + (i * step));
	var nodeRadius = screen.width*0.02 //
	var counter = -1

	main() // main function execution

	function main() {
		let graph
		switch (localStorage.getItem('graph')) {
			case 'firstGraph':
				graph = firstGraph
				document.getElementsByName('selection')[0].checked = true
				break;
			case 'secondGraph':
				graph = secondGraph
				document.getElementsByName('selection')[1].checked = true
				break;
			case 'thirdGraph':
				graph = thirdGraph
				document.getElementsByName('selection')[2].checked = true
				break;
			default:
				graph = firstGraph
				localStorage.setItem('graph', 'firstGraph')
				local.reload()
				break;
		}
		globalData.nodes = graph.nodes.map(node => {
			node.r = nodeRadius
			return node
		})
		globalData.links = graph.links.map(link => link)
		console.log(globalData)
		setSize()
		drawChart()
		getAllNodesNeighborhood() // Fill neighborhood
		console.log(neighborhoodLengths)
		colorGraph(neighborhoodLengths.indexOf(Math.max(...neighborhoodLengths)), [...neighborhoodLengths])
		for(let o of document.getElementsByName('selection'))
			o.addEventListener('change', function(){
				localStorage.setItem('graph', o.value)
				location.reload()
		})
		// let t = arrayRange(1, 7,1)
		// console.log(t.map(value => {return { "index": value, "label": "node" + value }}))
	}
	// For setting size of the svg 
	function setSize() {
		width = document.querySelector("#graph").clientWidth
		height = document.querySelector("#graph").clientHeight + 200

		margin = {top:0, left:0, bottom:0, right:0 }

		chartWidth = width - (margin.left+margin.right)
		chartHeight = height - (margin.top+margin.bottom)

		svg.attr("width", width).attr("height", height)

		chartLayer
			.attr("width", chartWidth)
			.attr("height", chartHeight)
			.attr("transform", "translate("+[margin.left, margin.top]+")")
	}
	// For drawing the chart
	function drawChart() {
		var simulation = d3.forceSimulation()
			.force("link", d3.forceLink().id(function(d) { return d.index }))
			.force("collide",d3.forceCollide( function(d){return d.r + 8 }).iterations(16) )
			.force("charge", d3.forceManyBody())
			.force("center", d3.forceCenter(chartWidth / 2, chartHeight / 2))
			.force("y", d3.forceY(0))
			.force("x", d3.forceX(0))
		var link = svg.append("g")
			.attr("class", "link")
			.selectAll("line")
			.data(globalData.links)
			.enter()
			.append("line")
			.attr("class", "link")
			.attr("id", function(d){ return "s" + d.source + "t" + d.target })
		var node = svg.append("g")
			.attr("class", "node")
			.selectAll("circle")
			.data(globalData.nodes)
			.enter().append("circle")
			.attr("r", function(d){  return d.r })
			.attr("label", function(d){  return d.label })
			.attr("id", function(d){  return d.label })
			.attr("index", function(d){  return d.index })
			.attr("visited", false)
			.call(d3.drag()
					.on("start", dragstarted)
					.on("drag", dragged)
					.on("end", dragended)
				)
				.on("mouseover", handleMouseOver)
				.on("ontouchstart", handleMouseOver)
				.on("mouseout", handleMouseOut)
		var ticked = function() {
			link
				.attr("x1", function(d) { return d.source.x })
				.attr("y1", function(d) { return d.source.y })
				.attr("x2", function(d) { return d.target.x })
				.attr("y2", function(d) { return d.target.y })

			node
				.attr("cx", function(d) { return d.x })
				.attr("cy", function(d) { return d.y })
		}  
		try {
			simulation
				.nodes(globalData.nodes)
				.on("tick", ticked)
			simulation
				.force("link")
				.links(globalData.links)
		} catch(e) {
			console.log(e);
		}

		function dragstarted(d) {
			if (!d3.event.active) simulation.alphaTarget(0.3).restart()
				d.fx = d.x
			d.fy = d.y
		}
		function dragged(d) {
			d.fx = d3.event.x
			d.fy = d3.event.y
		}
		function dragended(d) {
			if (!d3.event.active)
				simulation.alphaTarget(0)
			d.fx = null
			d.fy = null
		}
	}
	// Create Event Handlers for mouse
	function handleMouseOver(d, i) {
		let v = d3.select(this)
		if(!v.attr('clique-part'))
			// v.attr('fill', nodesMouseOverFillColor)
		showNodeLabelText(v.attr('label'))
		showNeighborhoodNodesLabels(v.attr('label'), nodesMouseOverNeighborsFillColor) // Fill neighborhood second option
	}
	function handleMouseOut(d, i) {
		let v = d3.select(this) // select node
		if(!v.attr('clique-part'))
			// v.attr('fill', nodesColor)
		d3.select('#text' + v.attr('label')).remove() // Remove text location
		showNeighborhoodNodesLabels(v.attr('label'), nodesColor) // second option
		d3.selectAll('.textNode').remove()
	}
	// For getting Neighborhood of al nodes
	function getAllNodesNeighborhood(){
		globalData.nodes.map(function(node){
			node.neighbors = getNeighborhoodLabels(node.index)
			if(node.neighbors.length)
				neighborhoodLengths.push(node.neighbors.length)
			d3.select('#' + node.label)
				.attr('neighborhood', node.neighbors.toString())
		})
	}
	// All nodes gas a Neighborhood
	function getNeighborhoodLabels(nodeIndex){
		let neighborsIndex = []
		globalData.links.map(function(link){
			if(link.source.index === nodeIndex && !neighborsIndex.includes(link.target.index))
				neighborsIndex.push(link.target.index)
			if(link.target.index === nodeIndex && !neighborsIndex.includes(link.source.index))
				neighborsIndex.push(link.source.index)
		})
		return neighborsIndex.map(function(index){ return globalData.nodes[index].label } )
	}
	// For filling a neighborhood from a node
	function showNeighborhoodNodesLabels(nodeLabel, color){// Fill neighborhood 
		let v = d3.select('#' + nodeLabel)
		let neighborhood = v.attr('neighborhood').split(',')
		if(neighborhood.length)
			neighborhood.map(function(neighborLabel){
				let node = d3.select('#' + neighborLabel)
				// node.attr('fill', color)
				showNodeLabelText(neighborLabel)
			})
	}
	function fillNeighborhoodNodes(nodeLabel, color){// Fill neighborhood 
		let v = d3.select('#' + nodeLabel)
		let neighborhood = v.attr('neighborhood').split(',')
		if(neighborhood.length)
			neighborhood.map(function(neighborLabel){
				let node = d3.select('#' + neighborLabel)
				if(!node.attr('visited')){
					node.attr('visited', true)
				}
				node.attr('fill', color)
				// showNodeLabelText(neighborLabel)
			})
	}
	// For filling a node
	function fillNode(nodeLabel, color){// Fill neighborhood 
		let v = d3.select('#' + nodeLabel)
		console.log('Fill visited: ' + v.attr('visited'), color)
		if(v.attr('visited')){
			v.attr('fill', color)
			v.attr('visited', true)
			console.log('filled')
		}
	}
	// For showing the node label
	function showNodeLabelText(nodeLabel){
		let n = d3.select('#' + nodeLabel)
		svg.append("text") // Name label text
			.attr('id', 'text' + n.attr('label'))
			.attr('label', 'textNode' + n.attr('label'))
			.attr('class', 'textNode')
			.attr('x', function() { return n.attr('cx') })
			.attr('y', function() { return n.attr('cy') + Math.floor(nodeRadius)})
			.style('font-size', nodeRadius)
			.text(function() {
				return n.attr('label').replace('node', '')
			})
	}
	// For getting Neighbors
	function getNeighbors(index){
		return globalData.nodes[index].neighbors.map(function(nodeLabel){
			return globalData.nodes[parseInt(nodeLabel.replace('node', ''))]
		})
	}
	// For getting subsets intersection
	function intersection(A, B){
		if(!A || !B || !A.length || !B.length)
			return []
		// console.log(A, B)
		let a = A.map(function(node){
			return node.index
		})
		let b = B.map(function(node){
			return node.index
		})
		let intersectionIndexes = a.filter(function(index){
			return b.includes(index)
		})
		let result = intersectionIndexes.map(function(index){
			return globalData.nodes[index]
		})
		// console.log(result)
		return result
	}
	// For filling all nodes of a subset
	function fillNodes(R, color = cliqueColor){
		// console.log(R, color)
		if(!R)
			return
		R.map(function(node){
			d3.select('#node' + node.index)
			.attr('fill', color)
			.attr('clique-part',true)
		})
	}
	// For delete a node from a graph
	function dropElement(G, n){
		return G.filter(function(node){
			return node.index !== n.index
		})
	}
	function colorGraph(nodeIndex, x){
		if(x == null || !globalData.nodes[nodeIndex] || x[nodeIndex] == -1)
			return
		fillNode(globalData.nodes[nodeIndex].label, nodesColors[++counter])
		if(counter >= nodesColors.length-1)
			counter = 0
		x[nodeIndex] = -1
		console.log(x)
		console.log(x.indexOf(Math.max(...x)), [...x], counter)
		colorGraph(x.indexOf(Math.max(...x)), [...x])
	}

}());
function setProperties(){
	localStorage.clear()
	localStorage.setItem('range', document.querySelector("#numberOfNodes").value)
	location.reload()
}
function setDefault(){
	localStorage.clear()
	location.reload()
}