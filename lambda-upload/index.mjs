import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import Busboy from 'busboy';
import { v4 as uuidv4 } from 'uuid';

const s3 = new S3Client({});

export const handler = async (event) => {
    const bucket = process.env.S3_BUCKET;
    const prefix = process.env.UPLOAD_PREFIX;

    return new Promise((resolve, reject) => {
        // Busboy ayuda a extraer el archivo de la petición HTTP
        const busboy = Busboy({ headers: { 'content-type': event.headers['content-type'] || event.headers['Content-Type'] } });
        let fileData, contentType, fileName;

        busboy.on('file', (name, file, info) => {
            const { filename, mimeType } = info;
            // Validamos formatos permitidos
            const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            if (!allowed.includes(mimeType)) {
                return resolve({ statusCode: 400, body: JSON.stringify({ error: "Formato no permitido" }) });
            }

            fileName = `${uuidv4()}-${filename}`;
            contentType = mimeType;
            const chunks = [];
            file.on('data', (data) => chunks.push(data));
            file.on('end', () => { fileData = Buffer.concat(chunks); });
        });

        busboy.on('finish', async () => {
            try {
                await s3.send(new PutObjectCommand({
                    Bucket: bucket,
                    Key: `${prefix}${fileName}`,
                    Body: fileData,
                    ContentType: contentType
                }));
                resolve({ 
                    statusCode: 201, 
                    body: JSON.stringify({ message: "Imagen recibida", file: fileName }) 
                });
            } catch (err) {
                resolve({ statusCode: 500, body: JSON.stringify({ error: err.message }) });
            }
        });

        // Escribimos el cuerpo de la petición en busboy
        const bodyBuffer = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : Buffer.from(event.body);
        busboy.end(bodyBuffer);
    });
};