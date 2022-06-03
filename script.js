const maskFile = document.getElementById('maskFile'),
    maskBtn = document.getElementById('maskBtn'),
    maskCanvas = document.getElementById('maskCanvas'),
    maskCtx = maskCanvas.getContext('2d'),
    generateBtn = document.getElementById('generateBtn'),
    originalFile = document.getElementById('originalFile'),
    originalBtn = document.getElementById('originalBtn'),
    originalCanvas = document.getElementById('originalCanvas'),
    originalCtx = originalCanvas.getContext('2d'),
    modalShade = document.getElementById('modalShade'),
    modalWrap = document.getElementById('modalWrap'),
    modalCanvas = document.getElementById('modalCanvas'),
    modalCtx = modalCanvas.getContext('2d'),
    pixelatedCanvas = document.getElementById('pixelatedCanvas'),
    pixelatedCtx = pixelatedCanvas.getContext('2d'),
    ditheredCanvas = document.getElementById('ditheredCanvas'),
    ditheredCtx = ditheredCanvas.getContext('2d');

let maskData,
    eyedropperObj = {},
    resetHoverObj = {},
    mouseTimeout,
    scale = 1,
    zoomOrigin = {x: 0, y: 0},
    oldScale = 1,
    modalOpen = false,
    originalExists = false;

maskFile.addEventListener('change', e => {
    drawImageToCanvas(e, maskCanvas, maskCtx);
});

maskBtn.addEventListener('click', e => {
    maskFile.click();
});

originalFile.addEventListener('change', e => {
    drawImageToCanvas(e, originalCanvas, originalCtx);
});

originalBtn.addEventListener('click', e => {
    originalFile.click();
});

modalWrap.addEventListener('click', function (e) {
    if (e.target.nodeName !== "CANVAS") {
        closeModal();
    }
});

modalCanvas.addEventListener('mousedown', e => {
    resetHover();
    let pos;
    if (zoomOrigin.x === 0 && zoomOrigin.y === 0 && scale === 1) pos = getCoords(e);
    else {
        let transformX = Math.abs(zoomOrigin.x / scale);
        let transformY = Math.abs(zoomOrigin.y / scale);
        let offsetX = e.offsetX * modalCanvas.width / modalCanvas.clientWidth / scale;
        let offsetY = e.offsetY * modalCanvas.height / modalCanvas.clientHeight / scale;
        let x = Math.floor(transformX + offsetX);
        let y = Math.floor(transformY + offsetY);
        pos = {x, y};
    }

    closeModal();

    const pixel = originalCtx.getImageData(pos.x, pos.y, 1, 1);
    const inputVal = pixel.data[0];

    const col = `#colColorRanges_${eyedropperObj.col}`;
    const fields = document.querySelector(`${col} > :nth-child(${eyedropperObj.row})`);
    const input = fields.querySelector(`input[data-pos="${eyedropperObj.pos}"]`);
    input.value = inputVal;
    changedInput(input);
});

modalCanvas.addEventListener('wheel', e => {
    e.preventDefault();
    modalCtx.save();

    let pos = getCoords(e);
    if (-1 * Math.sign(e.deltaY) === 1) {
        scale += scale * 1.1 - oldScale;
        if (scale > 8) scale = oldScale;
        else {
            zoomOrigin.x = pos.x - (pos.x - zoomOrigin.x) * 1.1;
            zoomOrigin.y = pos.y - (pos.y - zoomOrigin.y) * 1.1;
            modalCtx.setTransform(scale, 0, 0, scale, zoomOrigin.x, zoomOrigin.y);
            modalCtx.clearRect(0, 0, modalCanvas.width, modalCanvas.height);
            modalCtx.drawImage(originalCanvas, 0, 0);
            modalCtx.restore();
        }
    } else {
        if (scale <= 1) {
            scale = 1;
            zoomOrigin = {x: 0, y: 0}
            modalCtx.setTransform(1, 0, 0, 1, 0, 0);
        } else {
            scale -= scale - oldScale / 1.1;
            zoomOrigin.x = pos.x - (pos.x - zoomOrigin.x) / 1.1;
            zoomOrigin.y = pos.y - (pos.y - zoomOrigin.y) / 1.1;
            modalCtx.setTransform(scale, 0, 0, scale, zoomOrigin.x, zoomOrigin.y);
        }
        modalCtx.clearRect(0, 0, modalCanvas.width, modalCanvas.height);
        modalCtx.drawImage(originalCanvas, 0, 0);
        modalCtx.restore();
    }
    oldScale = scale;
});

modalCanvas.addEventListener('mousemove', e => {
    clearTimeout(mouseTimeout);
    resetHover();

    let mouseStopped = pos => {
        let pixel = modalCtx.getImageData(pos.x, pos.y, 1, 1);
        let data = pixel.data;

        if (data[3] !== 0) {
            resetHoverObj = {
                pos: pos,
                data: data
            };

            fillPixel(modalCtx, "#f1e740", pos.x, pos.y);
        }
    };
    mouseTimeout = setTimeout(function () {
        if (modalOpen) { // avoid console error
            let pos = getCoords(e);
            mouseStopped(pos);
        }
    }, 300);
});

generateBtn.addEventListener("click", e => {
    let row = 1;
    for (const maskHex in maskData) {
        generateRow(maskHex, row);
        row++;
    }
});

function drawImageToCanvas(e, canvas, ctx) {
    let reader = new FileReader();
    reader.onload = function (event) {
        const img = new Image();
        img.onload = function () {
            if (canvas.width && canvas.height) ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            const id = canvas.id;
            if (id === 'maskCanvas') maskUploaded();
            else if (id === 'originalCanvas') originalUploaded();
        }
        img.src = event.target.result;
    }
    reader.readAsDataURL(e.target.files[0]);
}

function maskUploaded() {
    if (pixelatedCanvas.width && pixelatedCanvas.height) pixelatedCtx.clearRect(0, 0, pixelatedCanvas.width, pixelatedCanvas.height);
    pixelatedCanvas.width = maskCanvas.width;
    pixelatedCanvas.height = maskCanvas.height;

    const imageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    const data = imageData.data;
    const width = imageData.width;
    const length = data.length;

    maskData = {};

    // store coordinates for each color in mask
    for (let i = 0; i < length; i += 4) {
        // skip transparent pixels
        if (data[i + 3]) {
            let hex = rgbToHex(data[i], data[i + 1], data[i + 2]);
            if (!maskData.hasOwnProperty(`#${hex}`)) maskData[`#${hex}`] = [];
            let coords = {};
            coords.x = (i / 4) % width;
            coords.y = Math.floor((i / 4) / width);
            maskData[`#${hex}`].push(coords);
        }
    }

    document.getElementById("colorPanel").style.visibility = "visible";
    originalBtn.style.visibility = "visible";

    const oldMaskElements = document.querySelectorAll(".maskData");
    for (let el of oldMaskElements) {
        el.remove();
    }

    const inputsWrapper = document.createElement("div");
    inputsWrapper.classList.add("inputsWrapper");
    inputsWrapper.classList.add("maskData");

    const input = document.createElement("input");
    input.type = "number";
    input.setAttribute("min", "0");
    input.setAttribute("max", "255");
    input.classList.add("inputs");

    const eyedropper = document.createElement("img");
    eyedropper.classList.add("eyedropper");
    eyedropper.src = "eye-dropper-solid.svg";
    if (!originalExists) eyedropper.style.visibility = "hidden";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = true;

    const col_1 = document.getElementById("colColorRanges_1");
    let row = 1;

    let inputChange = e => changedInput(e.target);

    let eyedropperClick = e => {
        modalOpen = true;
        modalShade.style.display = 'block';
        modalWrap.style.display = 'flex';
        eyedropperObj = {...e.target.dataset};
    };

    let checkboxChange = e => {
        const checkbox = e.target;
        const data = checkbox.dataset;
        const isChecked = checkbox.checked;
        const col = data.col;
        const row = data.row;
        const colEl = `#colColorRanges_${col}`;
        const fields = document.querySelector(`${colEl} > :nth-child(${row})`);
        const firstInput = fields.querySelector(`input[data-pos="first"]`);
        const lastInput = fields.querySelector(`input[data-pos="last"]`);

        if (isChecked) {
            firstInput.disabled = false;
            lastInput.disabled = false;
        }
        else {
            firstInput.disabled = true;
            lastInput.disabled = true;
        }
    }

    for (const hex in maskData) {
        const colorSquare = document.createElement("div");
        colorSquare.classList.add("colorSquare", "maskData");
        colorSquare.dataset.hex = hex;
        colorSquare.style.backgroundColor = hex;
        col_1.appendChild(colorSquare);

        for (let i = 2; i <= 8; i++) {
            const col = document.getElementById(`colColorRanges_${i}`);

            const newInputFirst = input.cloneNode();
            newInputFirst.dataset.col = `${i}`;
            newInputFirst.dataset.row = `${row}`;
            newInputFirst.addEventListener("change", inputChange);
            const newInputLast = newInputFirst.cloneNode();
            newInputFirst.dataset.pos = "first";
            newInputLast.dataset.pos = "last";
            newInputLast.addEventListener("change", inputChange);

            switch (i) {
                case 2:
                    newInputFirst.value = 0;
                    break;
                case 8:
                    newInputLast.value = 255;
                    break;
            }

            const eyedropperFirst = eyedropper.cloneNode();
            eyedropperFirst.dataset.col = `${i}`;
            eyedropperFirst.dataset.row = `${row}`;
            eyedropperFirst.addEventListener("click", eyedropperClick);
            const eyedropperLast = eyedropperFirst.cloneNode();
            eyedropperFirst.dataset.pos = "first";
            eyedropperLast.dataset.pos = "last";
            eyedropperLast.addEventListener("click", eyedropperClick);

            const newWrap = inputsWrapper.cloneNode();
            newWrap.appendChild(newInputFirst);
            newWrap.appendChild(eyedropperFirst);
            newWrap.appendChild(newInputLast);
            newWrap.appendChild(eyedropperLast);

            if (i % 2 === 1) {
                const ditherCheckbox = checkbox.cloneNode();
                ditherCheckbox.dataset.col = `${i}`;
                ditherCheckbox.dataset.row = `${row}`;
                ditherCheckbox.addEventListener("change", checkboxChange);
                newWrap.appendChild(ditherCheckbox);
            }
            col.appendChild(newWrap);
        }
        row++;
    }
}

function changedInput(input) {
    const inputVal = parseInt(input.value.trim());
    if (!Number.isInteger((inputVal))) input.value = '';
    else {
        const data = input.dataset;
        const pos = data.pos;
        const col = parseInt(data.col);
        const row = data.row;

        if (pos === "first" && col > 2) {
            let previousCol = col - 1;
            let colEl = `#colColorRanges_${previousCol}`;
            let fields = document.querySelector(`${colEl} > :nth-child(${row})`);
            // if previous column is a dither column and unchecked, go to the column before
            if (col % 2 === 0) {
                const checkbox = fields.querySelector(`input[type="checkbox"]`);
                if (!checkbox.checked) {
                    previousCol = col - 2;
                    colEl = `#colColorRanges_${previousCol}`;
                    fields = document.querySelector(`${colEl} > :nth-child(${row})`);
                }
            }
            const lastInput = fields.querySelector(`input[data-pos="last"]`);
            lastInput.value = inputVal - 1;
        } else if (pos === "last" && col < 8) {
            let nextCol = col + 1;
            let colEl = `#colColorRanges_${nextCol}`;
            let fields = document.querySelector(`${colEl} > :nth-child(${row})`);
            if (col % 2 === 0) {
                const checkbox = fields.querySelector(`input[type="checkbox"]`);
                if (!checkbox.checked) {
                    nextCol = col + 2;
                    colEl = `#colColorRanges_${nextCol}`;
                    fields = document.querySelector(`${colEl} > :nth-child(${row})`);
                }
            }
            const nextInput = fields.querySelector(`input[data-pos="first"]`);
            nextInput.value = inputVal + 1;
        }

        let completedFields = 0;
        for (let i = 2; i <= 8; i += 2) {
            const colEl = `#colColorRanges_${i}`;
            const fields = document.querySelector(`${colEl} > :nth-child(${row})`);
            const firstInput = fields.querySelector(`input[data-pos="first"]`);
            const lastInput = fields.querySelector(`input[data-pos="last"]`);
            const firstInputVal = parseInt(firstInput.value.trim());
            const lastInputVal = parseInt(lastInput.value.trim());
            if (Number.isInteger(firstInputVal) && Number.isInteger(lastInputVal)
                && firstInputVal >= 0 && firstInputVal <= 255 && lastInputVal >= 0 && lastInputVal <= 255)
                completedFields++;
        }

        if (completedFields === 4) {
            const rowColor = document.querySelector(`#colColorRanges_1 > :nth-child(${row})`);
            const maskHex = rowColor.dataset.hex;
            generateRow(maskHex, row);
        }
    }
}

function closeModal() {
    modalOpen = false;
    modalShade.style.display = "none";
    modalWrap.style.display = "none";
    scale = 1;
    oldScale = 1;
    zoomOrigin = {x: 0, y: 0};
    modalCtx.save();
    modalCtx.setTransform(1, 0, 0, 1, 0, 0);
    modalCtx.clearRect(0, 0, modalCanvas.width, modalCanvas.height);
    modalCtx.drawImage(originalCanvas, 0, 0);
    modalCtx.restore();
}

function resetHover() {
    if (resetHoverObj.hasOwnProperty('pos')) {
        let data = resetHoverObj.data;
        let pos = resetHoverObj.pos;
        resetHoverObj = {};

        fillPixel(modalCtx, `rgba(${data[0]}, ${data[1]}, ${data[2]}, ${data[3] / 255})`, pos.x, pos.y);
    }
}

function fillPixel(ctx, color, x, y) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 1, 1);
    ctx.restore();
}

function getCoords(e) {
    let pos = {};
    pos.x = Math.floor(e.offsetX * modalCanvas.width / modalCanvas.clientWidth);
    pos.y = Math.floor(e.offsetY * modalCanvas.height / modalCanvas.clientHeight);
    return pos;
}

function originalUploaded() {
    if (modalCanvas.width && modalCanvas.height) modalCtx.clearRect(0, 0, modalCanvas.width, modalCanvas.height);
    modalCanvas.width = originalCanvas.width;
    modalCanvas.height = originalCanvas.height;
    modalCtx.drawImage(originalCanvas, 0, 0);

    if (!originalExists) {
        originalExists = true;
        const eyedroppers = document.querySelectorAll(".eyedropper");
        for (let eyedropper of eyedroppers) {
            eyedropper.style.visibility = "visible";
        }
        generateBtn.style.visibility = "visible";
    }

    floydSteinberg();
}

function generateRow(maskHex, row) {
    let valArray = [];
    for (let i = 2; i <= 8; i++) {
        const header = `#header_${i}`;
        const col = `#colColorRanges_${i}`;
        const fields = document.querySelector(`${col} > :nth-child(${row})`);
        if (i % 2 === 1) {
            const checkbox = fields.querySelector(`input[type="checkbox"]`);
            if (!checkbox.checked) continue;
        }
        const firstInput = fields.querySelector(`input[data-pos="first"]`);
        const lastInput = fields.querySelector(`input[data-pos="last"]`);
        const firstInputVal = parseInt(firstInput.value.trim());
        const lastInputVal = parseInt(lastInput.value.trim());
        if (Number.isInteger(firstInputVal) && Number.isInteger(lastInputVal)
            && firstInputVal >= 0 && firstInputVal <= 255 && lastInputVal >= 0 && lastInputVal <= 255) {
            const colColor = document.querySelector(`${header} > :first-child`);
            const fillHex = colColor.dataset.hex;
            valArray.push({firstInputVal, lastInputVal, fillHex});
        }
    }
    const coordsArray = maskData[`${maskHex}`];
    const length = coordsArray.length;
    for (let i = 0; i < length; i++) {
        const coords = coordsArray[i];
        const x = coords.x;
        const y = coords.y;
        const pixel = originalCtx.getImageData(x, y, 1, 1);
        const pixelVal = pixel.data[0];
        const ditheredPixel = ditheredCtx.getImageData(x, y, 1, 1);
        const ditheredPixelVal = ditheredPixel.data[0];
        valArray.every(e => {
            const fillHex = e.fillHex;
            if (pixelVal >= e.firstInputVal && pixelVal <= e.lastInputVal) {
                if (fillHex === "#000000" || fillHex === "#808080" || fillHex === "#C0C0C0" || fillHex === "#FFFFFF")
                    fillPixel(pixelatedCtx, fillHex, x, y);
                else {
                    let ditheredFillHex;
                    switch (fillHex) {
                        case "#404040":
                            if (ditheredPixelVal) ditheredFillHex = "#808080";
                            else ditheredFillHex = "#000000"
                            break;
                        case "#A0A0A0":
                            if (ditheredPixelVal) ditheredFillHex = "#C0C0C0";
                            else ditheredFillHex = "#808080";
                            break;
                        case "#E0E0E0":
                            if (ditheredPixelVal) ditheredFillHex = "#FFFFFF";
                            else ditheredFillHex = "#C0C0C0";
                            break;
                    }
                    fillPixel(pixelatedCtx, ditheredFillHex, x, y);
                }
                return false;
            }

            return true;
        });
    }
}

function componentToHex(c) {
    let hex = c.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
    return componentToHex(r) + componentToHex(g) + componentToHex(b);
}

//generates dithered canvas, modified from https://github.com/NielsLeenheer/CanvasDither/blob/master/src/canvas-dither.js
function floydSteinberg() {
    if (ditheredCanvas.width && ditheredCanvas.height) ditheredCtx.clearRect(0, 0, ditheredCanvas.width, ditheredCanvas.height);
    const image = originalCtx.getImageData(0, 0, originalCanvas.width, originalCanvas.height);
    const width = image.width;
    const height = image.height;
    const luminance = new Uint8ClampedArray(width * height);

    for (let l = 0, i = 0; i < image.data.length; l++, i += 4) {
        luminance[l] = (image.data[i] * 0.299) + (image.data[i + 1] * 0.587) + (image.data[i + 2] * 0.114);
    }

    for (let l = 0, i = 0; i < image.data.length; l++, i += 4) {
        const value = luminance[l] < 129 ? 0 : 255;
        const error = Math.floor((luminance[l] - value) / 16);
        image.data.fill(value, i, i + 3);

        luminance[l + 1] += error * 7;
        luminance[l + width - 1] += error * 3;
        luminance[l + width] += error * 5;
        luminance[l + width + 1] += error * 1;
    }

    ditheredCanvas.width = width;
    ditheredCanvas.height = height;
    ditheredCtx.putImageData(image, 0, 0);
}

// FLOYD STEINBERG works better for this app
// function atkinson() {
//     if (ditheredCanvas.width && ditheredCanvas.height) ditheredCtx.clearRect(0, 0, ditheredCanvas.width, ditheredCanvas.height);
//     const image = originalCtx.getImageData(0, 0, originalCanvas.width, originalCanvas.height);
//     const width = image.width;
//     const height = image.height;
//
//     const luminance = new Uint8ClampedArray(width * height);
//
//     for (let l = 0, i = 0; i < image.data.length; l++, i += 4) {
//         luminance[l] = (image.data[i] * 0.299) + (image.data[i + 1] * 0.587) + (image.data[i + 2] * 0.114);
//     }
//
//     for (let l = 0, i = 0; i < image.data.length; l++, i += 4) {
//         const value = luminance[l] < 129 ? 0 : 255;
//         const error = Math.floor((luminance[l] - value) / 8);
//         image.data.fill(value, i, i + 3);
//
//         luminance[l + 1] += error;
//         luminance[l + 2] += error;
//         luminance[l + width - 1] += error;
//         luminance[l + width] += error;
//         luminance[l + width + 1] += error;
//         luminance[l + 2 * width] += error;
//     }
//
//     ditheredCanvas.width = width;
//     ditheredCanvas.height = height;
//     ditheredCtx.putImageData(image, 0, 0);
// }
