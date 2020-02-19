//================================================================================
//  MIT License
//  
//  Copyright (c) 2020 EddyK28
//  
//  Permission is hereby granted, free of charge, to any person obtaining a copy
//  of this software and associated documentation files (the "Software"), to deal
//  in the Software without restriction, including without limitation the rights
//  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
//  copies of the Software, and to permit persons to whom the Software is
//  furnished to do so, subject to the following conditions:
//  
//  The above copyright notice and this permission notice shall be included in all
//  copies or substantial portions of the Software.
//  
//  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
//  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
//  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
//  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
//  SOFTWARE.
//================================================================================


var containerText;
var containerQR;

var containerConv;
var containerTextConv;
var containerQRConv;

var rdRegions;
var rdRegionsConv;

//Mail code validity check Regex
var chAccept = /[^CFHJKMNPQRSTWXY1234567890@&\-#%+=]/gmi;

//QR Code encoder object
var qrGen;

//code priority status (which is the most up to date)  0=unknown, 1=text, 2=qr, 3=both
//  used by region convert to pick the most appropriate starting point
var status = 0;

//The data that should start all valid PSMD rescue-mail QR codes
var constHead = [0x00, 0x19, 0x59, 0x22, 0x33, 0x12, 0x04, 0x11];

//Lookup table for message hash function
var lookupTbl;

//Region conversion key (what chars to swap)
var convertKey = {
  2: 49,
  3: 12,
  4: 36,
  8: 26,
  15: 59,
  19: 41,
  29: 31
}

var canSizeDefault = 400;
var canSizeTry1 = 250;
var canSizeTry2 = 1000


function init() {
    //test for canvas support, fail if not supported
    if (typeof CanvasRenderingContext2D == "undefined") {
        document.getElementById("errCanv").style.display="block";
        document.getElementById("main").style.display="none";
        return;
    }
    
    containerText = document.getElementById("containerText");
    containerQR = document.getElementById("containerQR");
    
    containerConv = document.getElementById("containerConv");
    containerTextConv = document.getElementById("containerTextConv");
    containerQRConv = document.getElementById("containerQRConv");
    
    rdRegions = [null, document.getElementById("regUs"), document.getElementById("regEu")];
    rdRegionsConv = [null, document.getElementById("regUsConv"), document.getElementById("regEuConv")];
    
    canSizeDefault = document.getElementById("qrIn").width;
    
    lookupTbl = buildLookupTable();
    
    qrGen = new QRCode(null, {
        width : 250,
        height : 250,
        correctLevel : QRCode.CorrectLevel.L,
        img: containerQR,
        canvas: document.getElementById("qrOut"),
        clearCanvas : true
    });
    
    //load initial code from URL if present
    if(location.search.length > 1 && location.search[0] == '?') {
        containerText.value=formatCode(decodeURIComponent(location.search.substr(2)));
        rdRegions[Number(location.search[1])].checked=true;
        status=1;
        convert();
    }  
}

//Decode QR image to text 
function decode() {
    var mailCode = decodeQR(containerQR, document.getElementById("qrIn"));
    if (!mailCode) return;
    
    rdRegions[mailCode[0]].checked = true;
    
    var mailString = ""
    
    for (var i=1; i<mailCode.length; i+=2) {
        if (mailCode[i]==0xCE) mailString += '@';
        else mailString += String.fromCharCode(mailCode[i]);
    }
    
    containerText.value=formatCode(mailString);
    status = 1; //Text is primary
    return true;
}

//Encode QR image from text
function encode() {
    var mailString=formatCode(containerText.value, true);
    containerText.value=mailString;
    filterText(containerText);
    var region = Number(document.querySelector('input[name="rdRegion"]:checked').value)
    if (!encodeQR(mailString,containerQR,region)) return;
    
    status = 3;
    return true;
}

//Create alternate region version of code and QR
function convert() {
    //QR primary, so decode first
    if (status == 2 && !decode()) return;
    
    //Text primary and QR is not the same
    else if (status != 3 && !encode()) return;
    
    
    //get cleaned original code
    var mailString=formatCode(containerText.value, true);
    
    //swap text chars
    var temp;
    mailString = Array.from(mailString);
    for (a in convertKey) {
        temp = mailString[a];
        mailString[a] = mailString[convertKey[a]];
        mailString[convertKey[a]] = temp;
    }
    mailString = mailString.join('');
    
    //set converted text, encode new QR
    containerTextConv.value = formatCode(mailString);
    var region = Number(document.querySelector('input[name="rdRegion"]:checked').value)
    if (region == 1) region = 2;
    else region = 1;
    rdRegionsConv[region].checked = true;
    encodeQR(mailString,containerQRConv,region);
    
    containerConv.hidden=false;
}

function loadUrl() {
    var contents = "Please enter image URL:<br><input id='urlBox' type='textbox' style='width: 95%;'>";
    
    var accept = function(){
        var newUrl = document.getElementById("urlBox").value;
        closeModalBox(); 
        if (newUrl) {
            containerQR.src = newUrl;
            status = 2; //QR is primary
        } 
    }
    
    createModalBox(contents,[{func:accept,name:"OK"},{func:closeModalBox,name:"Cancel"}]);
    document.getElementById("urlBox").onkeypress=function(event){if(event.keyCode==13)accept()};
    document.getElementById("urlBox").focus();
}

function loadFile() {
    if (window.File && window.FileReader) {
        if (document.getElementById("upl01") == null) {
            var inFile = document.createElement('input');
            inFile.type = "file";
            inFile.accept="image/*";
            inFile.id = "upl01";
            inFile.hidden=true;
            document.body.appendChild(inFile);
            
            inFile.onchange = function (e) {
                var reader = new FileReader();
                reader.onload = function (e) {
                    if (e.target.readyState != 2);
                    else if (e.target.error) 
                        alert('Error while reading file'); 
                    else 
                        containerQR.src = e.target.result;
                        status = 2; //QR is primary
                };
                
                reader.readAsDataURL( e.target.files[0] );
            };
            
            inFile.click();
        } 
        else document.getElementById("upl01").click();
    } 
    else createModalBox('ERROR: File APIs are not supported in this browser.');
}

function loadCam() {
    //fail if no media support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        createModalBox("ERROR: Camera is not supported in this browser.");
        return;
    }
    
    var video = document.createElement("video");
    var canvas = document.getElementById("qrIn");
    var canCtx = canvas.getContext("2d");
    var camStream;
    
    canCtx.clearRect(0, 0, canvas.width, canvas.height);
    video.style.width="100%";
    
    function camCancel() {
        //stop and clean up camera
        if (camStream) camStream.getTracks().forEach(function(track) {track.stop()});
        camStream = null;
        video = null;
        canCtx.clearRect(0, 0, canvas.width, canvas.height);
        closeModalBox("cam"); 
        cancelAnimationFrame(camTick);
    }
    
    function camTick() {
        if (!video) return;
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
        
        //canCtx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        canCtx.drawImage(video, 0, 0, canvas.width, canvas.height);
        var mailCode = decodeQR(null, canvas, true);
        
        if (mailCode) {
            camCancel();
            rdRegions[mailCode[0]].checked = true;
            
            var mailString = ""
            
            for (var i=1; i<mailCode.length; i+=2) {
            if (mailCode[i]==0xCE) mailString += '@';
            else mailString += String.fromCharCode(mailCode[i]);
            }
            
            containerText.value=formatCode(mailString);
            encode();
            closeModalBox();
            return;
        }
        
        }
        requestAnimationFrame(camTick);
    }
    
    createModalBox("<b>Initializing Camera...</b>",{func:camCancel,name:"Cancel"},"cam");
    
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { max: 640 }, height: { max: 480 }} }).then(function(stream) {
        var content = boxes["cam"].getElementsByClassName("modal-content")[0];
        content.removeChild(content.firstChild);
        content.insertBefore(video, content.firstChild);
        video.srcObject = camStream = stream;
        video.setAttribute("playsinline", true);
        video.play();
        requestAnimationFrame(camTick);
    }).catch(function(err) {
        createModalBox("ERROR: Cannot start camera. ("+err.message+")");
        camCancel();
    });
}

function makeLink() {
    //QR primary, so decode first
    if (status == 2 && !decode()) return;
    
    var mailString=formatCode(containerText.value, true);
    if (mailString.match(chAccept)) {
        createModalBox("ERROR: Mail code contains illegal characters.");
        return;
    }
    if (mailString.length != 80) {
        createModalBox("ERROR: Mail code is the wrong size.");
        return;
    }
    
    var region = Number(document.querySelector('input[name="rdRegion"]:checked').value)
    var codeLink = location.protocol+"//"+location.hostname+location.pathname+"?"+region+encodeURIComponent(mailString);
    createModalBox("Rescue-Mail Code Link:<br><br><a href='"+codeLink+"'>"+codeLink+"</a><br>");
    box.style.overflowWrap="break-word";
    box.style.wordBreak="break-all";
}

function filterText(elm) {
    elm.value = elm.value.replace(/\(O\)|◎|\(circle\)/gmi, '@');
    elm.value = elm.value.replace(chAccept, '');
    elm.value = formatCode(elm.value).trim();
    status = 1; //text is primary
}

function convCopy() {
    containerText.value = containerTextConv.value;
    containerQR.src = containerQRConv.src;
    rdRegions[Number(document.querySelector('input[name="rdRegionConv"]:checked').value)].checked=true;
    convClose();
}

function convClose() {
    containerTextConv.value="";
    containerQRConv.src="";
    containerConv.hidden=true;
}

//--------------------------------------------------------------------//

function decodeQR(container, canvas, bStream) {
    var canCtx = canvas.getContext("2d");
    
    //get QR image data and attempt to read QR
    if (container) {
        canCtx.rect(0, 0, canvas.width, canvas.height);
        canCtx.fillStyle = "white";
        canCtx.fill();
        canCtx.drawImage(container, 0, 0, Math.min(canvas.width, container.naturalWidth), Math.min(canvas.height, container.naturalHeight));
    }
    var imageData = canCtx.getImageData(0, 0, canvas.width, canvas.height);
    var code = jsQR(imageData.data, imageData.width, imageData.height, {inversionAttempts: "attemptBoth"}); //dontInvert
    
    //if QR read successfully, check validity of contained data
    if (code) {
        //verify data length
        if (code.binaryData.length!=192) {
            createModalBox("ERROR: QR code is not valid. (Wrong Size)");
            canCtx.clearRect(0, 0, canvas.width, canvas.height);
            return
        }
        
        //verify constant initial bytes
        if (!equals(code.binaryData.slice(0,8),constHead) || code.binaryData[9]!=4) { // || code.binaryData[8]!=1
            createModalBox("ERROR: QR code is not valid. (Not for PSMD)");
            canCtx.clearRect(0, 0, canvas.width, canvas.height);
            return
        }
        
        //verify code region
        if(code.binaryData[8]!=1 && code.binaryData[8]!=2) {
            createModalBox("ERROR: QR code is not valid. (Unkown Region: "+code.binaryData[8]+")");
            canCtx.clearRect(0, 0, canvas.width, canvas.height);
            return
        }
        
        //verify code length
        if (code.binaryData[12]!=160) {
            createModalBox("ERROR: QR code is not valid. (Not a Rescue-Mail)");
            canCtx.clearRect(0, 0, canvas.width, canvas.height);
            return
        }
        
        //NOTE: meaning of byte 11 is unclear
        if (code.binaryData[11] != 0)
            console.log("QR Byte 11: "+code.binaryData[11]);
        
        var mailCode = code.binaryData.slice(32)
        
        //check hash
        var readHash = code.binaryData[24] | (code.binaryData[25]<<8) | (code.binaryData[26]<<16) | (code.binaryData[27]<<24);
        var compHash = crcSorta(mailCode,0xFFFFFFFF,lookupTbl);
        if (readHash != compHash) {
            createModalBox("ERROR: QR code is not valid. (Rescue-Mail Code Corrupted)");
            canCtx.clearRect(0, 0, canvas.width, canvas.height);
            return
        }
        
        canCtx.clearRect(0, 0, canvas.width, canvas.height);
        mailCode.unshift(code.binaryData[8]);
        return mailCode;
    }
    else if (!bStream) {
        //If QR read failed, try a different canvas size (it helps sometimes)
        if (canvas.width == canSizeDefault) {
            canvas.width = canSizeTry1;
            canvas.height = canSizeTry1;

            var code = decodeQR(container, canvas, bStream);
            canvas.width = canSizeDefault;
            canvas.height = canSizeDefault;
            return code;
        }
        //Try another size too
        if (canvas.width == canSizeTry1) {
            canvas.width = canSizeTry2;
            canvas.height = canSizeTry2;
            
            var code = decodeQR(container, canvas, bStream);
            canvas.width = canSizeDefault;
            canvas.height = canSizeDefault;
            return code;
        }
        //Everything failed, we give up
        else {
            canCtx.clearRect(0, 0, canvas.width, canvas.height);
            createModalBox("ERROR: Could not read QR code.");
        }

    }
}

function encodeQR(mailString, target, regionCode) {
    //validate input code
    if (mailString.match(chAccept)) {
        createModalBox("ERROR: Mail code contains illegal characters.");
        return;
    }
    if (mailString.length != 80) {
        createModalBox("ERROR: Mail code is the wrong size.");
        return;
    }
    
    //build mail header
    var mailHead = constHead.concat([regionCode,0x04,0x00,0x00,0xA0,0x00]);
    mailHead = mailHead.concat([0,0,0,0,0,0,0,0,0,0]);
    
    //create mail data from string
    var mailCode = []
    for (var i = 0, len = mailString.length; i < len; i++) {
        if (mailString[i] == '@') { mailCode.push(0xCE); mailCode.push(0x25) }
        else { mailCode.push(mailString.charCodeAt(i)); mailCode.push(0x00) }
    }
    
    //generate mail hash
    var mailHash = crcSorta(mailCode,0xFFFFFFFF,lookupTbl);
    mailHead.push(mailHash&0xFF);
    mailHead.push((mailHash&0xFF00) >>> 8);
    mailHead.push((mailHash&0xFF0000) >>> 16);
    mailHead.push((mailHash&0xFF000000) >>> 24);
    mailHead = mailHead.concat([0,0,0,0]);
            
    //combine mail head+data and encode QR
    target.src = qrGen.getCode(mailHead.concat(mailCode),true);
    
    return true;
}

function formatCode(code, deform) {
  if (deform) return code.replace(/[\n ]/g, '').replace(/\(O\)|◎|\(circle\)/gmi, '@').toUpperCase();
  return code.slice( 0,7 ) +' '+ code.slice( 7,13) +' '+ code.slice(13,20) +'\n'+
         code.slice(20,27) +' '+ code.slice(27,33) +' '+ code.slice(33,40) +'\n'+
         code.slice(40,47) +' '+ code.slice(47,53) +' '+ code.slice(53,60) +'\n'+
         code.slice(60,67) +' '+ code.slice(67,73) +' '+ code.slice(73,80);
}


function equals(array1,array2) {
    return (array1.length == array2.length) && array1.every(function(element, index) {
        return element === array2[index]; 
    });
}

function decimalToHexString(number) {
    if (number < 0) number = 0xFFFFFFFF + number + 1;
    return number.toString(16).toUpperCase();
}

//Build lookup table for game hash function
function buildLookupTable() {
    var lookupTbl = [];
    var idx = 0;
    var entry
    var tmp

    while ( idx < 0x100 ) {
        entry = idx;
        for(var i=0; i<4; i++) {
            if ( entry & 1 )
                tmp = (entry >>> 1) ^ 0xEDB88320;
            else
                tmp = entry >>> 1;
        
            if ( tmp & 1 )
                entry = (tmp >>> 1) ^ 0xEDB88320;
            else
                entry = tmp >>> 1;
        }
        
        lookupTbl.push(entry);
        idx++;
    }
    
    return lookupTbl;
}  

//Hash function equivalent to that used by the game. Looks kinda like CRC, but not quite.
function crcSorta(data, hash, lookupTbl) {
    var dLen = data.length
    var v8, v12
    
    if ( dLen )
    {
        var didx = 0
        if ( dLen & 1 )
        {
            v8 = data[didx++]
            hash = lookupTbl[(v8 ^ hash)&0xFF] ^ (hash >>> 8);
        }
        for (var i = dLen >>> 1; i; hash = lookupTbl[(byte2 ^ v12)&0xFF] ^ (v12 >>> 8) )
        {
            --i;
            byte1 = (data[didx] ^ hash)&0xFF;
            byte2 = data[didx+1];
            didx += 2;
            v12 = lookupTbl[byte1] ^ (hash >>> 8);
        }
    }
    return ~hash;
}
