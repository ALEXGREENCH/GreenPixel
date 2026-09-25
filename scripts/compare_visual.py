from pathlib import Path
import json
import numpy as np
from PIL import Image
root=Path('docs/visual')
a=np.asarray(Image.open(root/'original.png').convert('RGB'))
mask=np.ones(a.shape[:2],dtype=bool)
# Original has Settings open, a different copyright/version and status hint.
mask[:107,450:705]=False
mask[925:970,1330:1680]=False
mask[969:]=False
result={}
for name in ['before','after']:
 b=np.asarray(Image.open(root/f'{name}.png').convert('RGB'))
 if a.shape!=b.shape: raise ValueError('Client areas must have identical dimensions')
 delta=np.abs(a.astype(np.int16)-b.astype(np.int16))
 result[name]={'mean_absolute_rgb_error':float(delta[mask].mean()),'pixels_compared':int(mask.sum())}
 if name=='after':
  Image.blend(Image.fromarray(a),Image.fromarray(b),.5).save(root/'overlay.png')
  Image.fromarray(np.clip(delta*4,0,255).astype('uint8')).save(root/'difference.png')
result['error_reduction_percent']=100*(1-result['after']['mean_absolute_rgb_error']/result['before']['mean_absolute_rgb_error'])
(root/'metrics.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
