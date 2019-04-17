const Graph = ForceGraph3D()
    (document.getElementById("3d-graph"));


// Color according to node degree
// Color according to sequence similarity
// Color according to 1st neighbour
// Spring force constant modified for common localisation
// Color according to localisation
// dnTree implementation


zip= rows=>rows[0].map((_,c)=>rows.map(row=>row[c]))


let noTemplateBool = true; // Boolean for template inclusion in GO stat
let materialHot = new THREE.MeshBasicMaterial();
materialHot.color.set('red')

let displayData;

let registryData = undefined;
let GOactive = {};
(displayData = function() {

    qwest.get('interactome.json').then((_, data) => {
        //data.nodes.forEach(node => { node.name = `${node.user?node.user+': ':''}${node.description || node.id}` });
       /* data.links.forEach((l) => {
            l.curvature = l.target == l.source ? 2 : 0;
            l.linkCurveRotation = 0;
        });*/
 
        Graph
            .linkOpacity(0.8)
            .linkCurvature((l)=>l.target == l.source ? 0.5 : 0)    
            // .linkCurveRotation('rotation')
            //.linkDirectionalParticles(2)
            .cooldownTicks(300)
            .cooldownTime(10000)
            .nodeLabel((n)=>n.uniprot.geneName)
            .autoColorBy('group')
            .forceEngine('ngraph')
            //.linkWidth(0)
            .graphData(data);//.nodes.forEach((n)=>{n.selected = false;});
            //.linkWidth(2);
            console.log(data);
            
            Graph.graphData().nodes.forEach((n)=>{n.selected = false;});
           
            /*
           Graph
           .linkOpacity(0.8)
           .linkCurvature((l)=>l.target == l.source ? 2 : 0)           
           //.linkCurveRotation('rotation')
           .linkDirectionalParticles(2)
           .graphData(data);
*/
        Graph.onEngineStop(()=>{
            console.log('Stoped');
            Graph.cooldownTicks(0)
            .cooldownTime(0)
        });

        setTimeout(()=>{ // Life cycle stencil component issue
        buildTree();
       
        if ( data.hasOwnProperty('registry') ) {
            console.log("Loading registry")
            registryData = data.registry;

            console.dir(registryData)
            let _gochart = document.getElementById("gochart");
            let d = refreshGoBuffer(registryData);

            _gochart.data = d;

            bindGOchartComponent();
            bindNetworkRegistry();

            let _netTable = document.getElementById("network-table");
            _netTable.data = netTableFormat();
            bindNetworkTable();
            }
      
        },1500);

               
    });


    Graph.onNodeClick(node => {
        console.log(node);
        node = node.__threeObj.position;
        // Aim at node from outside it
        const distance = 40;
        const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);
        console.log(distRatio);
        Graph.cameraPosition(
          { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }, // new position
          node, // lookAt ({ x, y, z })
          3000  // ms transition duration
        );
    });
    

})(); // IIFE init


function netTableFormat() {
    console.log("netTableFormat");

    if (Object.getOwnPropertyNames(tree).length === 0)
        buildTree();
    let headers = [["uniprotID", "gene name", "degree"]];

    let content = Graph.graphData().nodes.map((n) => [n.uniprot.id, n.uniprot.geneName, n.degree]);

    let arr = headers.concat(content);

    //    console.dir(arr);
    return arr;
}

function bindNetworkTable() {
    console.log("Binding Network Table");
    document.addEventListener("tableCellSelectEvent", function(d){
        console.log(d);
        let node = nodeSearch(d.detail[0]); 
        console.log(node);
      });
}

/* Wired Registry reference to nodes and links*/
function bindNetworkRegistry() {
    function _wire(d) {
        d[0] = getRegistryElem(d[0]);
    }

    Graph.graphData().links.forEach((link) => {
        link.data['lowQueryParam'].forEach(_wire)
        link.data['highQueryParam'].forEach(_wire);
    });
    Graph.graphData().nodes.forEach((node) => {
        node.uniprot = getRegistryElem(node.id);
        getRegistryElem(node.id).nodeObj = node;
    });
}



function bindGOchartComponent() {
    document.addEventListener("goSelectEvent", function(d){
        console.log("Outer clicked");    
        let GOreq = d.detail;
        console.dir(GOreq);
        if (GOreq.status)
            GOactive[GOreq.id] = true;
        else 
            delete GOactive[GOreq.id]
        
        Graph.graphData().nodes.forEach(downlight);
        for (let goTermID in GOactive)
            nodeGOSearch(goTermID).forEach(highlight);
      });
}

function getRegistryElem(idString){
    if (idString in registryData)
        return registryData[idString];
    throw("Unregistred ID " + idString);
}
function getRegistryQueryNodes(){

    if (Object.getOwnPropertyNames(tree).length === 0)
        buildTree();
    
}

// Basic Go term statiscitcs done on Query subtree -- IN DEV !!!
// 1) Add optional template support
// 2) Add check that corresponding node is acive in current view
function refreshGoBuffer(registryData, type='queryNodes') {
    let GOdata = {};

    /*
    for (let typeKey in registryData) {  
        if (typeKey === 'templateOnly' && noTemplateBool)
            continue;
    */
    //let uniprotList = registryData[typeKey]
    let uniprotList = registryData;
        for (let uID in uniprotList) {
            if (!isNode(uID) && type == 'queryNodes') {
       //         console.log("NO");
                continue;
            }

        //    console.log("-->"  + uID)
            let goArray = uniprotList[uID].GO;
        //    console.log(goArray)
            goArray.forEach((goTerm)=> {  
                if (! GOdata.hasOwnProperty(goTerm.id)) {
                    GOdata[goTerm.id] = {
                    'id' : goTerm.id,
                    'term' : goTerm.term,
                    'value' : 0
                    }
                }
                GOdata[goTerm.id].value += 1;
            });
        }
    //}

    return Object.keys(GOdata).map(k => GOdata[k]);
}

//https://threejs.org/docs/#api/geometries/SphereGeometry
function inFlat(node) {
    var geometry = new THREE.SphereGeometry( 250, 32, 32 );
    var material = new THREE.MeshBasicMaterial( {color: 0xffff00} );
    var sphere = new THREE.Mesh( geometry, material );
    scene.add( sphere );
    //node.__threeObj.geometry = geometry;
}


function letsCook() {
    if (Object.getOwnPropertyNames(tree).length === 0)
        buildTree();
    
        let scores = buildStats();
    colorEdgeStats(scores);
    toggleEdgeColor('idPct');
}


function getNodeTemplates(node){
    if (Object.getOwnPropertyNames(tree).length === 0)
        buildTree();
    let templateObj = new Set();
    for ( let _suff of zip([ [tree, iTree], ["lowQueryParam", "highQueryParam"] ] )  ) {
        console.log(_suff);
        if (_suff[0].hasOwnProperty(node.id)) {
            for (let _target in _suff[0][node.id]){
                _suff[0][node.id][_target].forEach((link) => {
                    link.data[_suff[1]].forEach((param)=> {
                        templateObj.add(param[param.length - 1])
                    });
                });
            }
        }
    }
    return [...templateObj];
}


let tree = {} // Adjacency Litteral, where primary/secondary keys are source/target
let iTree = {} // Adjacency Litteral, where primary/secondary keys are target/source
// Each link is effectively registered twice

/* Adjacency Tree and add degree attribute to each node */
function buildTree() {
   
        console.log("Building adjacency Trees");
        Graph.graphData().links.forEach((link) => {
            if ( !tree.hasOwnProperty(link.source) )
                tree[link.source] = {};
            if ( !iTree.hasOwnProperty(link.target) )
                iTree[link.target] = {};

            if ( !tree[link.source].hasOwnProperty(link.target) )
                tree[link.source][link.target] = [];
            if ( !iTree[link.target].hasOwnProperty(link.source) )
                iTree[link.target][link.source] = [];

        //console
        tree[link.source][link.target].push(link);
        iTree[link.target][link.source].push(link);
        });

        Graph.graphData().nodes.forEach((node) => {
            let a = tree.hasOwnProperty(node.id) ? Object.keys(tree[node.id]).length : 0;
            let b = iTree.hasOwnProperty(node.id) ? Object.keys(iTree[node.id]).length : 0;
            node.degree = a + b;
    /*  if node has autoassociation, node.id are primary/secondary keys in both tree/iTree
        And the correponding link is effectivelly counted twice. 
        Have to we decrement the node degree once.
    */
            if (a > 0) {
                if ( tree[node.id].hasOwnProperty(node.id) )
                    node.degree -= 1;
            }
        });
}

function isNode(id) {
    return tree.hasOwnProperty(id) || iTree.hasOwnProperty(id);
}
/*
    Computing statistics on a single homology support per edge, must be corrected

*/

function buildStats() {
    let min = {
        'covPct' : 999,
        'simPct' : 100,
        'idPct' : 100,
        'eValue' : 1.0
    };
    let max = {
        'covPct' : 0,
        'simPct' : 0,
        'idPct' : 0,
        'eValue' : 0
    };
    let sCrit = ['covPct', 'simPct', 'idPct', 'eValue'];

    Graph.graphData().links.forEach((link) => {
        if (link.hasOwnProperty('stats')) return;
        link['stats'] = computeLinkStat(link);

        sCrit.forEach((k) => {
            min[k] = link.stats[k] < min[k] ? link.stats[k] : min[k];
            max[k] = link.stats[k] > max[k] ? link.stats[k] : max[k];
        });

        //console.log(link.stats.cov + ' ' + min.cov);
    });

    return { 'max' : max, 'min' : min };
}

// We represent and edge by its minimal values accross its query/template relationship scores
function computeLinkStat (link) {

    /*let results = {
        'len' : len,
        'simPct' : parseFloat(data[2])  / parseFloat(len) ,
        'idPct'  : parseFloat(data[3])  / parseFloat(len) ,
        'eValue' : Number(data[4])
    };*/

    results = {
        'covPct' : 999.9,
        'simPct' : 1.0 ,
        'idPct'  : 1.0 ,
        'eValue' : 0.0
    };

    for (let data of zip([ link.data.lowQueryParam, link.data.highQueryParam ]) ) {
        let lowLen   = parseInt(data[0][1]) - parseInt(data[0][0]) + 1;
        let hiLen    = parseInt(data[1][1]) - parseInt(data[1][0]) + 1;
        let lowCov   = parseFloat(lowLen) / parseFloat(data[0][8]);
        let hiCov    = parseFloat(hiLen)  / parseFloat(data[1][8]);
        let lowSim   = parseFloat(data[0][2])  / parseFloat(lowLen);
        let hiSim    = parseFloat(data[1][2])  / parseFloat(hiLen);
        let lowId    = parseFloat(data[0][3])  / parseFloat(lowLen);
        let hiId     = parseFloat(data[1][3])  / parseFloat(hiLen);
        let lowValue = Number(data[0][4]);
        let hiValue  = Number(data[1][4]);

        let tCov  = lowCov  < hiCov    ? lowCov   : hiCov;
        let tId   = lowId   < hiId     ? lowId    : hiId;
        let tSim  = lowSim  < hiSim    ? lowSim   : hiSim;
        let tEval = lowValue > hiValue ? lowValue : hiValue;

        results.covPct = tCov   < results.covPct  ? tCov   : results.covPct;
        results.simPct = tSim   < results.simPct  ? tSim   : results.simPct;
        results.idPct  = tId    < results.idPct   ? tId    : results.idPct;
        results.eValue = tEval  > results.eValue  ? tEval  : results.eValue;
    }

    if (results.eValue == 0) {
        console.dir(link);
    }

/*
    let data = link.data.highQueryParam[0];


    results = {
        'len' : len,
        'simPct' : parseFloat(data[2])  / parseFloat(len) ,
        'idPct'  : parseFloat(data[3])  / parseFloat(len) ,
        'eValue' : Number(data[4])
    };
*/
    return results;
}

function colorEdgeStats(param) {
    let scales = {
        'simPct'   :  d3.scaleLinear()
                    .domain([param.min.simPct, param.max.simPct])
                    .range(["steelblue", "red"]),
        'idPct'    :  d3.scaleLinear()
                    .domain([param.min.idPct, param.max.idPct])
                    .range(["steelblue", "red"]),
        'covPct'    :  d3.scaleLinear()
                    .domain([param.min.covPct, param.max.covct])
                    .range(["steelblue", "red"]),
        'eValue' :  d3.scaleLog()
                    .domain([param.min.eValue, param.max.eValue])
                    .range(["steelblue", "red"]),
    };

     Graph.graphData().links.forEach((link) => {
        link.colors = {
            'simPct'    : scales.simPct(link.stats.simPct),
            'idPct'     : scales.idPct(link.stats.idPct),
            'covPct'     : scales.idPct(link.stats.covPct),
            'eValue' : scales.eValue(link.stats.eValue),
        };
    });
}

function toggleEdgeColor(key) {
    Graph.graphData().links.forEach((link) => {
        link.__lineObj.material = new THREE.LineBasicMaterial( {
            color: link.colors[key],
            linewidth: 2,
            opacity : 0.2,
            linecap: 'round', //ignored by WebGLRenderer
            linejoin:  'round' //ignored by WebGLRenderer
            });
    });
}





function unselectAll() {
    Graph.graphData().nodes.forEach(  downlight );
    let _gochart = document.getElementById("gochart");
    _gochart.clearSelection();
}

function highlight(node) {
        if(!node.hasOwnProperty('_pMaterial'))
            node._pMaterial = node.__threeObj.material
        node.__threeObj.material = materialHot
        node.selected = true;
}
function downlight(node) {
    if ( !node.hasOwnProperty('_pMaterial') )
        return;
    node.__threeObj.material = node._pMaterial;
    node.selected = false;
}

function nodeSearch(stringLookedUp, field) {
    let nodeMatch = [];
    let re = new RegExp('^' + stringLookedUp + '$');
    let _nodeField = field ? field : 'id';
   
    Graph.graphData().nodes.forEach( (node) => {
        if ( re.test(node.uniprot[_nodeField]) ) {
            console.dir(node);
            highlight(node);
            nodeMatch.push(node);
            return;
        }
        downlight(node);
    });

    return nodeMatch;
}

function nodeGOSearch(GOidString, templateExtended=false) {
    //let nodeMatch = [];
   //let re = new RegExp('^' + GOidString + '$');
    //let tBool = templateExtended ? templateExtended : false;
// In order to be selected a node or one of its template must feature at least one go occurence
    return Graph.graphData().nodes.filter( (node) => {
     //   console.log(templateExtended);
        let _uniprotObjList = [ getRegistryElem(node.id) ];
    //    console.log(_uniprotObjList);
        if(templateExtended)
            _uniprotObjList += getNodeTemplates(node); // TO DO
        _uniprotObjList = [...new Set(_uniprotObjList)];
        
        for (let uniprotEntry of _uniprotObjList) 
            for (let goTerm of uniprotEntry.GO)
                if(goTerm.id === GOidString)
                    return true;
        return false;
    });
}

function save() {

    return status;
}

function unClipSelected() {
    let centerNodes = Graph.graphData().nodes.filter(n=>n.selected);
    clip(centerNodes, true);
}

//clip around currently selected nodes
function clipSelected() {
    let centerNodes = Graph.graphData().nodes.filter(n=>n.selected);
    console.log('Seed selected nodes are ' + centerNodes);
    clip(centerNodes);
    let _netTable = document.getElementById("network-table");
    let toHideInTable = {"header" : "uniprotID", "values" : [] };
    toHideInTable.values = Graph.graphData().nodes.filter( n => !n.__threeObj.visible).map((n) => n.id);
    _netTable.hood = toHideInTable;
}


// Hide all but first neighbors of provided node
function clip(centerNodes, force=false) {
    if (Object.getOwnPropertyNames(tree).length === 0)
        buildTree();

    Graph.graphData().nodes.forEach( (node) => {
        node.__threeObj.visible = force ? node.__threeObj.visible : false;
        for (let centerNode of centerNodes) {
        //centerNodes.forEach((centerNode) => {
            if ( nodeEqual(centerNode, node) ||
                neighboorsBool(centerNode, node)
                ) {
                console.log('i will show ' + node.id);
                node.__threeObj.visible = true;
                break;
            }    
        }
    });

    Graph.graphData().links.forEach( (link) => {
        link.__lineObj.visible = force ? link.__lineObj.visible : false;
    });

    centerNodes.forEach((centerNode) => {
        let linkByPartner = getPartnersLink(centerNode);
        for (let partner in linkByPartner)
            linkByPartner[partner][0].__lineObj.visible = true;
    });
}
// Return flat list of link list, involving the query node
// source/target distinctions are not considered
function getPartnersLink(qNode) {
    let pLinks = {};
    for (let _tree of [tree, iTree])
        if (qNode.id in _tree)
            for (let pSymbol in  _tree[qNode.id]) 
                pLinks[pSymbol] = _tree[qNode.id][pSymbol]

    return pLinks
}

// Restore clipped node and table elements
function unClip() {
    Graph.graphData().nodes.forEach( (node) => {
        node.__threeObj.visible = true;
    });
    Graph.graphData().links.forEach( (link) => {
        link.__lineObj.visible = true;
    });

    let _netTable = document.getElementById("network-table");
    _netTable.hood = undefined;
}

function nodeEqual(n1, n2) {
    return n1.id === n2.id;
}
/*
function listNeighboorNodes(node) {
    if(!tree.hasOwnProperty(node.id))
        return [];
    nodeList = []
    for (let nodeKey in tree[node.id]) {
        nodeList.push()
    }
}
*/

function nodeList() {
    return Array.from( new Set(Object.keys(tree).concat( Object.keys(iTree)) ) );
}

function neighboorsBool(node1, node2) {
/* console.log("--------");  
    console.log(node1);
    console.log(node2);
  */  
    if(tree.hasOwnProperty(node1.id))
        if ( tree[node1.id].hasOwnProperty(node2.id) )
            return true;

    if(iTree.hasOwnProperty(node1.id))
        if ( iTree[node1.id].hasOwnProperty(node2.id) )
            return true;
    
    return false;
}

function getLinkThreeObj(node1, node2) {
    if ( !neighboorsBool(node1, node2) )
        return null;
    
    if ( tree.hasOwnProperty(node1.id) )
        if (tree[node1.id].hasOwnProperty(node2.id) )
            return tree[node1.id][node2.id][0].__lineObj;
    return iTree[node1.id][node2.id][0].__lineObj;
}
