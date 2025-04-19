
const express = require('express');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const cors = require('cors');
const ffmpegPath = require('ffmpeg-static');

ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '100mb' }));

const OUTPUT_DIR = path.join(__dirname, 'videos');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

app.post('/render', async (req, res) => {
    const { frames, fps = 30, format = 'webm' } = req.body;
    const timestamp = Date.now();
    const folder = path.join(OUTPUT_DIR, String(timestamp));
    fs.mkdirSync(folder);

    try {
        console.log("Iniciando renderização com os seguintes dados:");
        console.log("Quantidade de frames:", frames.length);
        console.log("FPS:", fps);
        console.log("Formato:", format);
        console.log("Pasta temporária:", folder);

        for (let i = 0; i < frames.length; i++) {
            const base64Data = frames[i].replace(/^data:image\/(png|jpeg);base64,/, '');
            const filePath = path.join(folder, `frame_${i.toString().padStart(4, '0')}.png`);
            fs.writeFileSync(filePath, base64Data, 'base64');
        }

        const outputPath = path.join(folder, `output.${format}`);
        await new Promise((resolve, reject) => {
            ffmpeg()
                .input(path.join(folder, 'frame_%04d.png'))
                .inputFPS(fps)
                .outputFPS(fps)
                .output(outputPath)
                .on('end', resolve)
                .on('error', (err) => {
                    console.error("Erro no FFmpeg:", err.message);
                    reject(err);
                })
                .run();
        });

        res.json({ url: `/videos/${timestamp}/output.${format}` });
    } catch (err) {
        console.error("Erro ao gerar vídeo:", err);
        res.status(500).json({ error: 'Erro ao gerar vídeo', details: err.message });
    }
});

app.use('/videos', express.static(OUTPUT_DIR));
app.listen(3000, () => console.log("Servidor rodando na porta 3000"));
