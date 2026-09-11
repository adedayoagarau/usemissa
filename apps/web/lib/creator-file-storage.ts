
/** Local-only bytes store for the creator workflow. Hosted storage stays explicit. */
const root=()=>process.env.MISSA_LOCAL_FILE_STORAGE_DIR?.trim()||'.data/creator-files';
export function localCreatorFileStorageEnabled(){return process.env.NODE_ENV!=='production' && process.env.MISSA_DISABLE_LOCAL_FILE_STORAGE!=='1';}
function safeKey(key:string){const normalized=key.replaceAll('\\','/');if(!normalized.startsWith('missa/')||normalized.includes('..'))throw new Error('Invalid file storage key.');return `${root()}/${normalized.slice('missa/'.length)}`;}
async function localFs(){return import('node:fs/promises');}
export async function writeLocalCreatorFile(key:string,bytes:Buffer){const {mkdir,writeFile}=await localFs();const target=safeKey(key);const slash=target.lastIndexOf('/');await mkdir(slash>0?target.slice(0,slash):'.',{recursive:true});await writeFile(target,bytes,{flag:'wx'}).catch(async error=>{if((error as NodeJS.ErrnoException).code==='EEXIST')return;throw error;});}
export async function readLocalCreatorFile(key:string){const {readFile}=await localFs();return readFile(safeKey(key));}
export async function deleteLocalCreatorFile(key:string){const {unlink}=await localFs();await unlink(safeKey(key)).catch(error=>{if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;});}
export function creatorFileStorageReady(){return Boolean(process.env.BLOB_READ_WRITE_TOKEN||(process.env.VERCEL_OIDC_TOKEN&&process.env.BLOB_STORE_ID)||localCreatorFileStorageEnabled());}
