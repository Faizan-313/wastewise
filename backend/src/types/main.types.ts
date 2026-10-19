declare global {
    namespace Express {
        interface Request {
            user?: { id: string };
        }
    }
}

type UploadedFile = Express.Multer.File;

type InputPart = | 
    {
        type: "text";
        value: string;
    }| 
    {
        type: "audio";
        file: UploadedFile;
    } | 
    {
        type: "image";
        file: UploadedFile;
    };

interface NormalizedInput {
    parts: InputPart[];
}

export type { InputPart, NormalizedInput, UploadedFile };