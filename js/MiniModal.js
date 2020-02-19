//TODO: allow multiple boxes at once

var box;
var boxes = {};
function createModalBox(txt,func,id) {
    if (box && !id) return;
    if (id && typeof(id) !== "string") return;
    var mdBox = document.createElement("DIV");
    mdBox.className = "modal";
    
    var sub = document.createElement("DIV");
    sub.style.height="20%"
    mdBox.appendChild(sub);
    
    sub = document.createElement("DIV");
    sub.className = "modal-content";
    sub.innerHTML = txt+"<br><br>";
    mdBox.appendChild(sub);
    
    
    var btn 
    if (typeof(func)==="function") {
        btn = document.createElement("BUTTON");
        btn.innerHTML = "Okay";
        btn.onclick = func;
        sub.appendChild(btn);
    }
    else if (typeof(func)==="object" && typeof(func.func)==="function" && typeof(func.name)==="string") {
        btn = document.createElement("BUTTON");
        btn.innerHTML = func.name;
        btn.onclick = func.func;
        sub.appendChild(btn);
    }
    else if (Array.isArray(func)) {
        for (var i=0; i<func.length; i++)
        {
            if (typeof(func[i])==="object" && typeof(func[i].func)==="function" && typeof(func[i].name)==="string") {
                btn = document.createElement("BUTTON");
                btn.innerHTML = func[i].name;
                btn.onclick = func[i].func;
                sub.appendChild(btn);
            }
        }
    }
    else {
        btn = document.createElement("BUTTON");
        btn.innerHTML = "Okay";
        btn.onclick = closeModalBox;
        sub.appendChild(btn);
    }

    document.body.appendChild(mdBox);
    
    if (id) boxes[id] = mdBox;
    else box = mdBox;
}

function closeModalBox(id) {
    if (id && typeof(id) === "string") {
        document.body.removeChild(boxes[id]);
        boxes[id] = null;
    }
    else if (box){
        document.body.removeChild(box);
        box = null;
    }
}