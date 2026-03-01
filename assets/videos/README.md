# Tutorial videos

Place your tutorial slide videos here. The tutorial modal will play them when each slide is active.

## File names (match these for the default config)

| Slide   | Filename                 |
|--------|--------------------------|
| Discover | `tutorial-discover.mp4` |
| Route    | `tutorial-route.mp4`   |
| Reserve  | `tutorial-reserve.mp4`  |
| Share    | `tutorial-share.mp4`   |
| Premium  | `tutorial-premium.mp4` |

## Requirements

- **Format**: MP4 (H.264 is widely supported on iOS and Android).
- **Size**: Keep files small (e.g. &lt; 5 MB per clip) so the app bundle stays light. Use short loops or 10–30 s clips.
- **Orientation**: Portrait or square works best for the modal layout.

## Enabling videos in the app

1. Add your `.mp4` files into this folder (`assets/videos/`).
2. In `tutorial/config/tutorialSlides.ts`, uncomment the `video: require(...)` line for each slide that has a file.

Example for one slide:

```ts
{
  id: 'discover',
  title: 'Discover available spots',
  description: '...',
  video: require('@/assets/videos/tutorial-discover.mp4'),
},
```

3. Rebuild/restart the app. Slides with a `video` set will show the video; others keep the placeholder.

You can enable videos per slide: only add and uncomment the ones you have.
