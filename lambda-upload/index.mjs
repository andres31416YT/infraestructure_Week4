import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from 'uuid';

const s3 = new S3Client({});

export const handler = async (event) => {
    try {
        const bucket = process.env.S3_BUCKET;
        const prefix = process.env.UPLOAD_PREFIX;
        
        // Detectar el tipo de contenido o usar uno por defecto
        const contentType = event.headers['content-type'] || event.headers['Content-Type'] || 'image/jpeg';
        const extension = contentType.split('/')[1] || 'jpg';
        const fileName = `${uuidv4()}.${extension}`;

        // Convertir el cuerpo de la petición (Base64 a Buffer si viene de API Gateway)
        const fileBuffer = event.isBase64Encoded 
            ? Buffer.from(event.body, 'base64') 
            : Buffer.from(event.body);

        if (!fileBuffer || fileBuffer.length === 0) {
            return { statusCode: 400, body: JSON.stringify({ error: "Archivo vacío" }) };
        }

        await s3.send(new PutObjectCommand({
            Bucket: bucket,
            Key: `${prefix}${fileName}`,
            Body: fileBuffer,
            ContentType: contentType
        }));

        return {
            statusCode: 201,
            body: JSON.stringify({ message: "Imagen recibida", file: fileName })
        };
    } catch (err) {
        console.error("Error en Lambda Upload:", err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message })
        };
    }
};