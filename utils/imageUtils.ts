/**
 * 画像の向きを修正する（EXIF情報を考慮）
 */
function getImageOrientation(img: HTMLImageElement): number {
  // EXIF情報から向きを取得（簡易版）
  // 実際のEXIF情報の読み取りにはライブラリが必要だが、ここでは基本的な処理のみ
  return 1; // デフォルトは正常
}

/**
 * 画像を正しい向きに回転させる
 */
function fixImageOrientation(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  orientation: number
) {
  const width = canvas.width;
  const height = canvas.height;

  // 向きに応じて回転・反転
  switch (orientation) {
    case 2:
      ctx.transform(-1, 0, 0, 1, width, 0);
      break;
    case 3:
      ctx.transform(-1, 0, 0, -1, width, height);
      break;
    case 4:
      ctx.transform(1, 0, 0, -1, 0, height);
      break;
    case 5:
      ctx.transform(0, 1, 1, 0, 0, 0);
      break;
    case 6:
      ctx.transform(0, 1, -1, 0, height, 0);
      break;
    case 7:
      ctx.transform(0, -1, -1, 0, height, width);
      break;
    case 8:
      ctx.transform(0, -1, 1, 0, 0, width);
      break;
  }
}

/**
 * HEIC形式のファイルかどうかを判定
 */
function isHeicFile(file: File): boolean {
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();
  
  return (
    fileType.includes('heic') ||
    fileType.includes('heif') ||
    fileName.endsWith('.heic') ||
    fileName.endsWith('.heif')
  );
}

/**
 * BlobをIndexedDBで保存可能な形式に変換
 */
async function normalizeBlobForIndexedDB(blob: Blob): Promise<Blob> {
  try {
    console.log('[Blob正規化] 開始:', {
      blobSize: blob.size,
      blobType: blob.type,
      blobIsClosed: blob.size === 0,
    });

    // BlobをArrayBufferに変換してから新しいBlobとして再作成
    // これにより、IndexedDBで確実に保存可能な形式になる
    const arrayBuffer = await blob.arrayBuffer();
    console.log('[Blob正規化] ArrayBuffer取得完了:', {
      arrayBufferSize: arrayBuffer.byteLength,
    });

    const normalizedBlob = new Blob([arrayBuffer], { type: blob.type });
    console.log('[Blob正規化] 完了:', {
      normalizedSize: normalizedBlob.size,
      normalizedType: normalizedBlob.type,
    });

    return normalizedBlob;
  } catch (error) {
    console.error('[Blob正規化] エラー:', {
      error,
      errorType: typeof error,
      errorName: error instanceof Error ? error.name : 'N/A',
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : 'N/A',
      blobSize: blob.size,
      blobType: blob.type,
    });
    throw error;
  }
}

/**
 * HEIC形式のファイルをJPEGに変換
 */
async function convertHeicToJpeg(file: File): Promise<File> {
  try {
    console.log('[HEIC変換] 開始:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });

    // クライアントサイドでのみ動作するため、動的インポートを使用
    const heic2anyModule = await import('heic2any');
    const heic2any = heic2anyModule.default;
    
    console.log('[HEIC変換] heic2anyモジュール読み込み完了');
    
    const convertedBlob = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.9,
    });
    
    console.log('[HEIC変換] 変換完了:', {
      isArray: Array.isArray(convertedBlob),
      blobType: Array.isArray(convertedBlob) ? convertedBlob[0]?.type : convertedBlob?.type,
      blobSize: Array.isArray(convertedBlob) ? convertedBlob[0]?.size : convertedBlob?.size,
    });
    
    // heic2anyは配列を返す可能性があるため、最初の要素を取得
    const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
    
    if (!blob) {
      throw new Error('HEIC変換後のBlobが取得できませんでした');
    }

    if (!(blob instanceof Blob)) {
      const blobType = typeof blob;
      const constructorName = (blob as any)?.constructor?.name || 'unknown';
      throw new Error(`HEIC変換後のオブジェクトがBlobではありません: ${blobType}, ${constructorName}`);
    }
    
    // IndexedDBで保存可能な形式に正規化
    console.log('[HEIC変換] Blob正規化開始');
    const normalizedBlob = await normalizeBlobForIndexedDB(blob);
    console.log('[HEIC変換] Blob正規化完了:', {
      normalizedSize: normalizedBlob.size,
      normalizedType: normalizedBlob.type,
    });
    
    // BlobをFileに変換
    const jpegFile = new File(
      [normalizedBlob],
      file.name.replace(/\.(heic|heif)$/i, '.jpg'),
      { type: 'image/jpeg' }
    );
    
    console.log('[HEIC変換] 完了:', {
      jpegFileName: jpegFile.name,
      jpegFileSize: jpegFile.size,
      jpegFileType: jpegFile.type,
    });
    
    return jpegFile;
  } catch (error) {
    console.error('[HEIC変換] エラー詳細:', {
      error,
      errorType: typeof error,
      errorName: error instanceof Error ? error.name : 'N/A',
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : 'N/A',
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });
    
    const errorMessage = error instanceof Error 
      ? `HEIC形式の変換に失敗しました: ${error.name} - ${error.message}${error.stack ? `\nスタック: ${error.stack}` : ''}`
      : `HEIC形式の変換に失敗しました: ${String(error)}`;
    
    throw new Error(errorMessage);
  }
}

/**
 * 画像をリサイズ・圧縮してBlobとして返す
 * 長辺を1200pxにリサイズし、JPEG品質を0.8に設定
 * スマホからの画像（HEICなど）も対応
 */
export async function resizeAndCompressImage(file: File): Promise<Blob> {
  // HEIC形式の場合は先にJPEGに変換
  let processedFile = file;
  if (isHeicFile(file)) {
    try {
      processedFile = await convertHeicToJpeg(file);
    } catch (error) {
      throw error;
    }
  }

  return new Promise((resolve, reject) => {
    // ファイル形式の検証
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    const fileType = processedFile.type.toLowerCase();

    // サポートされていない形式の場合でも、画像として読み込みを試みる
    if (!validTypes.includes(fileType) && !fileType.startsWith('image/')) {
      console.warn(`Unknown image type: ${fileType}, attempting to process anyway`);
    }

    const reader = new FileReader();
    
    reader.onload = (e) => {
      if (!e.target?.result) {
        reject(new Error('ファイルの読み込みに失敗しました'));
        return;
      }

      const img = new Image();
      
      img.onload = () => {
        try {
          const MAX_SIZE = 1200;
          let width = img.width;
          let height = img.height;

          // 長辺がMAX_SIZEより大きい場合はリサイズ
          if (width > height && width > MAX_SIZE) {
            height = (height * MAX_SIZE) / width;
            width = MAX_SIZE;
          } else if (height > MAX_SIZE) {
            width = (width * MAX_SIZE) / height;
            height = MAX_SIZE;
          }

          // キャンバスを作成してリサイズ
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
          }

          // 画像の向きを修正（EXIF情報を考慮）
          const orientation = getImageOrientation(img);
          ctx.save();
          fixImageOrientation(canvas, ctx, img, orientation);
          ctx.drawImage(img, 0, 0, width, height);
          ctx.restore();

          // JPEG形式で圧縮（品質0.8）
          canvas.toBlob(
            (blob) => {
              if (blob) {
                // IndexedDBで保存可能な形式に正規化
                normalizeBlobForIndexedDB(blob)
                  .then((normalizedBlob) => {
                    resolve(normalizedBlob);
                  })
                  .catch((error) => {
                    reject(new Error(`画像の正規化に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`));
                  });
              } else {
                reject(new Error('画像の圧縮に失敗しました。別の画像を試してください。'));
              }
            },
            'image/jpeg',
            0.8
          );
        } catch (error) {
          reject(new Error(`画像処理中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      };

      img.onerror = (error) => {
        reject(new Error('画像の読み込みに失敗しました。サポートされている形式（JPEG、PNG、WebP、GIF、HEIC）か確認してください。'));
      };

      img.src = e.target.result as string;
    };

    reader.onerror = (error) => {
      reject(new Error('ファイルの読み込みに失敗しました。ファイルが破損している可能性があります。'));
    };

    try {
      reader.readAsDataURL(processedFile);
    } catch (error) {
      reject(new Error(`ファイルの読み込みを開始できませんでした: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  });
}

/**
 * BlobをData URLに変換（表示用）
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
