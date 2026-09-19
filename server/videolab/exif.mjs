import { open } from 'node:fs/promises';

// Read only JPEG APP1 metadata, never the full photo. TIFF offsets are bounded.
export async function jpegOrientation(file) {
  const handle=await open(file,'r');
  try {
    const bytes=Buffer.alloc(256*1024);const {bytesRead}=await handle.read(bytes,0,bytes.length,0);const b=bytes.subarray(0,bytesRead);
    if(b.length<4||b.readUInt16BE(0)!==0xffd8)return 1;
    for(let at=2;at+4<=b.length;) {
      if(b[at]!==255)break;const marker=b[at+1];if(marker===0xda||marker===0xd9)break;
      const length=b.readUInt16BE(at+2);if(length<2||at+2+length>b.length)break;
      if(marker===0xe1&&b.subarray(at+4,at+10).toString('binary')==='Exif\0\0') {
        const t=b.subarray(at+10,at+2+length);if(t.length<8)return 1;
        const le=t.toString('ascii',0,2)==='II';if(!le&&t.toString('ascii',0,2)!=='MM')return 1;
        const u16=n=>le?t.readUInt16LE(n):t.readUInt16BE(n),u32=n=>le?t.readUInt32LE(n):t.readUInt32BE(n);
        if(u16(2)!==42)return 1;const offset=u32(4);if(offset+2>t.length)return 1;
        const count=u16(offset);
        for(let i=0;i<count;i++){const e=offset+2+i*12;if(e+12>t.length)break;if(u16(e)===0x112&&u16(e+2)===3&&u32(e+4)===1){const value=u16(e+8);return value>=1&&value<=8?value:1;}}
      }
      at+=length+2;
    }
    return 1;
  }finally{await handle.close();}
}
export const orientationFilters={1:'',2:'hflip,',3:'hflip,vflip,',4:'vflip,',5:'transpose=clock,hflip,',6:'transpose=clock,',7:'transpose=clock,vflip,',8:'transpose=cclock,'};
