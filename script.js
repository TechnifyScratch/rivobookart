let folds = [];
let currentPage = 0;
const colors = ["red", "blue", "green"];

function generate() {
  const pageHeight = parseFloat(document.getElementById("pageHeight").value);
  const pageWidth = parseFloat(document.getElementById("pageWidth").value);
  const numPages = parseInt(document.getElementById("numPages").value);
  const word = document.getElementById("foldWord").value;

  if (!word) {
    alert("Enter a word to fold!");
    return;
  }

  // Render word to bitmap
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = numPages;
  tempCanvas.height = 200;
  const tctx = tempCanvas.getContext("2d");
  tctx.fillStyle = "white";
  tctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
  tctx.fillStyle = "black";
  tctx.font = "bold 150px Arial";
  tctx.textAlign = "center";
  tctx.textBaseline = "middle";
  tctx.fillText(word, tempCanvas.width / 2, tempCanvas.height / 2);

  const imageData = tctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height).data;

  folds = [];
  for (let x = 0; x < numPages; x++) {
    let ranges = [];
    let inShape = false;
    let startY = null;

    for (let y = 0; y < tempCanvas.height; y++) {
      const idx = (y * tempCanvas.width + x) * 4;
      const isBlack = imageData[idx] < 128;

      if (isBlack && !inShape) {
        inShape = true;
        startY = y;
      } else if (!isBlack && inShape) {
        inShape = false;
        ranges.push([startY, y]);
      }
    }
    if (inShape) ranges.push([startY, tempCanvas.height]);

    // Convert ranges into fold points (top + bottom)
    let rawPoints = ranges.map(([topY, bottomY]) => ({
      top: (topY / tempCanvas.height) * pageHeight,
      bottom: (bottomY / tempCanvas.height) * pageHeight
    }));

    // Limit to max 3 points
    rawPoints = rawPoints.slice(0, 3);

    // Reassign points into sections
    const numPoints = rawPoints.length;
    if (numPoints > 0) {
      const sectionHeight = pageHeight / numPoints;
      const sectionedPoints = rawPoints.map((pt, i) => {
        const sectionTop = i * sectionHeight;
        const sectionBottom = (i + 1) * sectionHeight;

        // Clamp fold coordinates into this section
        const adjTop = Math.max(sectionTop, Math.min(pt.top, sectionBottom));
        const adjBottom = Math.max(sectionTop, Math.min(pt.bottom, sectionBottom));

        return {
          top: adjTop,
          bottom: adjBottom,
          sectionTop,
          sectionBottom
        };
      });
      folds.push(sectionedPoints);
    } else {
      folds.push(null);
    }
  }

  currentPage = 0;
  showPage(currentPage, pageHeight, pageWidth);
}

function showPage(n, pageHeight, pageWidth) {
  const canvas = document.getElementById("pageCanvas");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw page rectangle
  ctx.strokeStyle = "black";
  ctx.strokeRect(50, 50, pageWidth, pageHeight);

  const pagePoints = folds[n];
  let txt = `Page ${n + 1}: `;

  if (pagePoints) {
    pagePoints.forEach((pt, i) => {
      const color = colors[i % colors.length];
      ctx.strokeStyle = color;

      // Top fold
      ctx.beginPath();
      ctx.moveTo(50, 50 + pt.sectionTop);
      ctx.lineTo(50 + pageWidth, 50 + pt.top);
      ctx.stroke();

      // Bottom fold
      ctx.beginPath();
      ctx.moveTo(50, 50 + pt.sectionBottom);
      ctx.lineTo(50 + pageWidth, 50 + pt.bottom);
      ctx.stroke();

      txt += `Point ${i + 1} (section ${i + 1}): top→${pt.top.toFixed(1)} mm, bottom→${pt.bottom.toFixed(1)} mm. `;

      // Draw dashed cut line above this section (except first section)
      if (i > 0) {
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = "black";
        ctx.beginPath();
        ctx.moveTo(50, 50 + pt.sectionTop);
        ctx.lineTo(50 + pageWidth, 50 + pt.sectionTop);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });
  } else {
    txt += "No folds needed.";
  }

  document.getElementById("pageText").innerText = txt;
  document.getElementById("pageNum").innerText = `Page ${n + 1}`;
}

function prevPage() {
  if (currentPage > 0) {
    currentPage--;
    const ph = parseFloat(document.getElementById("pageHeight").value);
    const pw = parseFloat(document.getElementById("pageWidth").value);
    showPage(currentPage, ph, pw);
  }
}

function nextPage() {
  if (currentPage < folds.length - 1) {
    currentPage++;
    const ph = parseFloat(document.getElementById("pageHeight").value);
    const pw = parseFloat(document.getElementById("pageWidth").value);
    showPage(currentPage, ph, pw);
  }
}

async function downloadPDF() {
  if (!folds.length) {
    alert("Generate instructions first!");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text("Book Folding Instructions (Multi-Point with Cuts)", 20, 20);

  let y = 30;
  folds.forEach((pagePoints, i) => {
    if (y > 250) { doc.addPage(); y = 20; }

    doc.setFontSize(12);
    doc.text(`Page ${i + 1}:`, 20, y);
    y += 6;

    if (pagePoints) {
      pagePoints.forEach((pt, j) => {
        const color = colors[j % colors.length];
        const rgb = color === "red" ? [255,0,0] : color === "blue" ? [0,0,255] : [0,150,0];
        doc.setTextColor(...rgb);
        doc.text(
          `Point ${j + 1} (section ${j + 1}): Top ${pt.top.toFixed(1)} mm, Bottom ${pt.bottom.toFixed(1)} mm`,
          30, y
        );
        y += 6;
      });
      doc.setTextColor(0,0,0);

      // Draw diagram
      const startX = 150, startY = y - (pagePoints.length * 6);
      const previewHeight = 50;
      const scale = previewHeight / parseFloat(document.getElementById("pageHeight").value);
      doc.setDrawColor(0,0,0);
      doc.rect(startX, startY, 30, previewHeight);

      pagePoints.forEach((pt, j) => {
        const color = colors[j % colors.length];
        const rgb = color === "red" ? [255,0,0] : color === "blue" ? [0,0,255] : [0,150,0];
        doc.setDrawColor(...rgb);

        // Top fold
        doc.line(startX, startY + pt.sectionTop * scale, startX + 30, startY + pt.top * scale);

        // Bottom fold
        doc.line(startX, startY + pt.sectionBottom * scale, startX + 30, startY + pt.bottom * scale);

        // Dashed cut lines for section dividers
        if (j > 0) {
          doc.setDrawColor(0,0,0);
          doc.setLineDash([1,1],0);
          doc.line(startX, startY + pt.sectionTop * scale, startX + 30, startY + pt.sectionTop * scale);
          doc.setLineDash([]);
        }
      });
    } else {
      doc.text("No folds", 30, y);
      y += 6;
    }
    y += 60;
  });

  doc.save("folding_instructions.pdf");
}
