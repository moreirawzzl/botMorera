import sys, pathlib, zipfile, json
mode, input_name, output_name, display_name = sys.argv[1:]
src, dst = pathlib.Path(input_name), pathlib.Path(output_name)
if mode == "zip":
    with zipfile.ZipFile(dst, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=3) as z:
        z.write(src, arcname=display_name)
elif mode == "pdf":
    from PIL import Image, ImageOps
    Image.MAX_IMAGE_PIXELS = 16000000
    with Image.open(src) as im:
        if im.width * im.height > 16000000:
            raise ValueError("Imagem grande demais")
        im = ImageOps.exif_transpose(im)
        im.thumbnail((2200,2200))
        rgba = im.convert("RGBA")
        bg = Image.new("RGB", rgba.size, "white")
        bg.paste(rgba, mask=rgba.getchannel("A"))
        bg.save(dst, "PDF", resolution=150)
elif mode == "extrairpdf":
    from pypdf import PdfReader
    reader = PdfReader(src, strict=False)
    if reader.is_encrypted:
        raise ValueError("PDF protegido")
    result = []
    for i, page in enumerate(reader.pages[:30], 1):
        t = (page.extract_text() or "").strip()
        if t:
            result.append(f"--- Página {i} ---\n{t[:20000]}")
        if sum(map(len,result)) >= 60000:
            break
    dst.write_text("\n\n".join(result)[:60000], encoding="utf-8")
elif mode == "lerqrcode":
    from PIL import Image, ImageOps
    import zxingcpp
    Image.MAX_IMAGE_PIXELS = 16000000
    with Image.open(src) as im:
        if im.width * im.height > 16000000:
            raise ValueError("Imagem grande demais")
        im = ImageOps.exif_transpose(im).convert("RGB")
        im.thumbnail((2500,2500))
        found = zxingcpp.read_barcodes(im, formats=zxingcpp.BarcodeFormat.QRCode)
        dst.write_text("\n\n".join(x.text for x in found[:5])[:8000], encoding="utf-8")
else:
    raise ValueError("Modo desconhecido")
