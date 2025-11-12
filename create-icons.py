from PIL import Image, ImageDraw

# Create 192x192 icon
img192 = Image.new('RGB', (192, 192), color='#4CAF50')
draw = ImageDraw.Draw(img192)
img192.save('/home/user/meal-prep/icon-192.png')

# Create 512x512 icon
img512 = Image.new('RGB', (512, 512), color='#4CAF50')
draw = ImageDraw.Draw(img512)
img512.save('/home/user/meal-prep/icon-512.png')

print("Icons created successfully")
