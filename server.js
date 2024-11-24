const { program } = require('commander');
const { exit } = require('process');
const express = require('express');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const multer = require('multer');

program
    .option('-h, --host <host>', 'Server address', '0.0.0.0')
    .option('-p, --port <port>', 'Server port', 3000)
    .option('-c, --cache <cacheDir>', 'Path to cache directory', './cache');

program.parse();
const options = program.opts();

if (!options.host) {
    console.error("Please provide the host address.");
    exit(1);
}

if (!options.port) {
    console.error("Please provide the port number.");
    exit(1);
}

if (!options.cache) {
    console.error("Please provide the path to the cache directory.");
    exit(1);
}

if (!fs.existsSync(options.cache)) {
    fs.mkdirSync(options.cache, { recursive: true });
}

const app = express();
app.use(bodyParser.text());
app.use(multer().none());
app.use(express.json());

app.get('/notes/:name', (req, res) => {
    const noteName = req.params.name;
    const notePath = path.join(options.cache, `${noteName}.txt`);

    fs.readFile(notePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(404).send('Note not found');
        }
        res.status(200).send(data);
    });
});

app.put('/notes/:name', (req, res) => {
    const noteName = req.params.name;
    const notePath = path.join(options.cache, `${noteName}.txt`);
    const noteContent = typeof req.body === 'object' ? req.body.text : req.body;

    if (!noteContent) {
        return res.status(400).send('Note content is required');
    }

    if (!fs.existsSync(notePath)) {
        return res.status(404).send('Note not found');
    }
    fs.writeFile(notePath, noteContent, 'utf8', (err) => {
        if (err) {
            return res.status(500).json({ message: 'Server error', error: err });
        }
        res.status(200).send('Note updated');
    });
});

app.delete('/notes/:name', (req, res) => {
    const noteName = req.params.name;
    const notePath = path.join(options.cache, `${noteName}.txt`);

    fs.unlink(notePath, (err) => {
        if (err) {
            if (err.code === 'ENOENT') {
                return res.status(404).send('Note not found');
            } else {
                return res.status(500).json({ message: 'Server error', error: err });
            }
        }
        res.status(200).send('Note deleted');
    });
});

app.post('/write', (req, res) => {
    const noteName = req.body.note_name;
    const noteContent = req.body.note;

    if (!noteContent) {
        return res.status(400).send('Note content cannot be empty');
    }

    const notePath = path.join(options.cache, `${noteName}.txt`);

    if (fs.existsSync(notePath)) {
        return res.status(400).send('A note with this name already exists');
    } else {
        fs.writeFile(notePath, noteContent, 'utf-8', (err) => {
            if (err) {
                return res.status(500).json({ message: 'Server error', error: err });
            }
            res.status(201).send('Note successfully created');
        });
    }
});

app.get('/notes', (req, res) => {
    const notesInCache = fs.readdirSync(options.cache);
    const notes = notesInCache.map((note) => {
        const noteName = path.basename(note, '.txt');
        const notePath = path.join(options.cache, note);
        const noteText = fs.readFileSync(notePath, 'utf8');
        return { name: noteName, text: noteText };
    });
    res.status(200).json(notes);
});

app.get('/UploadForm.html', (req, res) => {
    const htmlPage = fs.readFileSync('./UploadForm.html');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(htmlPage);
});

app.listen(options.port, options.host, () => {
    console.log(`Server is running at http://${options.host}:${options.port}`);
});
