/**
 * Single tutorial slide: video (or placeholder) + title + description.
 * Uses React.memo; video pauses when slide is inactive (caller controls via isActive).
 */
import React, { memo, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Text } from '@/components/Themed';
import type { TutorialSlideItem } from '@/tutorial/config/tutorialSlides';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VIDEO_HEIGHT_RATIO = 0.6;

type TutorialSlideProps = {
  slide: TutorialSlideItem;
  isActive: boolean;
  textColor: string;
  textSecondaryColor: string;
  onVideoEnd?: () => void;
};

function TutorialSlideComponent({
  slide,
  isActive,
  textColor,
  textSecondaryColor,
  onVideoEnd,
}: TutorialSlideProps) {
  const videoRef = useRef<Video>(null);
  const hasVideo = slide.video != null;

  useEffect(() => {
    if (!hasVideo || !videoRef.current) return;
    if (isActive) {
      videoRef.current.playAsync().catch(() => {});
    } else {
      videoRef.current.pauseAsync().catch(() => {});
    }
  }, [isActive, hasVideo]);

  useEffect(() => {
    if (!hasVideo) return;
    return () => {
      videoRef.current?.unloadAsync().catch(() => {});
    };
  }, [hasVideo]);

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    if (status.didJustFinishAndNotLoop && status.positionMillis >= (status.durationMillis ?? 0) - 200) {
      onVideoEnd?.();
    }
  };

  const videoHeight = SCREEN_WIDTH * VIDEO_HEIGHT_RATIO;

  return (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      <View style={styles.slideContent}>
        <View style={[styles.videoContainer, { height: videoHeight }]}>
          {hasVideo ? (
            <Video
              ref={videoRef}
              source={slide.video as { uri?: string } | number}
              style={styles.video}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay={isActive}
              isLooping={false}
              isMuted
              useNativeControls={false}
              onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
            />
          ) : (
            <View style={styles.videoPlaceholder} />
          )}
        </View>
        <Text style={[styles.title, { color: textColor }]}>{slide.title}</Text>
        <Text style={[styles.description, { color: textSecondaryColor }]}>{slide.description}</Text>
      </View>
    </View>
  );
}

export const TutorialSlide = memo(TutorialSlideComponent);

const styles = StyleSheet.create({
  slide: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideContent: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  videoContainer: {
    width: '100%',
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    flex: 1,
    backgroundColor: 'rgba(0, 175, 245, 0.15)',
    borderRadius: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    paddingHorizontal: 8,
    minHeight: 96,
  },
});
