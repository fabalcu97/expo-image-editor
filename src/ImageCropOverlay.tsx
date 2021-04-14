import * as React from 'react';
import { Animated, StyleSheet, View, TouchableOpacity } from 'react-native';
import _ from 'lodash';
import { useRecoilState } from 'recoil';
import {
  cropSizeState,
  imageBoundsState,
  accumulatedPanState,
  fixedCropAspectRatioState,
  lockAspectRatioState,
  minimumCropDimensionsState,
} from './Store';
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
  State,
} from 'react-native-gesture-handler';

// const horizontalSections = ['top', 'middle', 'bottom'];
const horizontalSections = [];
const verticalSections = ['left', 'middle', 'right'];

function ImageCropOverlay() {
  // Record which section of the fram window has been pressed
  // this determines whether it is a translation or scaling gesture
  const [selectedFrameSection, setSelectedFrameSection] = React.useState('');

  // Shared state and bits passed through recoil to avoid prop drilling
  const [cropSize, setCropSize] = useRecoilState(cropSizeState);
  const [imageBounds] = useRecoilState(imageBoundsState);
  const panX = React.useRef(new Animated.Value(imageBounds.x));
  const panY = React.useRef(new Animated.Value(imageBounds.y));
  const [accumulatedPan, setAccumluatedPan] = React.useState<{
    x: number;
    y: number;
  }>({ x: 0, y: 0 });
  const [fixedAspectRatio] = useRecoilState(fixedCropAspectRatioState);

  const [animatedCropSize] = React.useState({
    width: new Animated.Value(cropSize.width),
    height: new Animated.Value(cropSize.height),
  });

  React.useEffect(() => {
    // Move the pan to the origin and check the bounds so it clicks to
    // the corner of the image
    // checkCropBounds({
    //   translationX: 0,
    //   translationY: 0,
    // });
    // When the crop size updates make sure the animated value does too!
    animatedCropSize.height.setValue(cropSize.height);
    animatedCropSize.width.setValue(cropSize.width);
  }, [cropSize]);

  React.useEffect(() => {
    // Update the size of the crop window based on the new image bounds
    let newSize = { width: 0, height: 0 };
    const { width, height } = imageBounds;
    const imageAspectRatio = width / height;
    // Then check if the cropping aspect ratio is smaller
    if (fixedAspectRatio < imageAspectRatio) {
      // If so calculate the size so its not greater than the image width
      newSize.height = height;
      newSize.width = height * fixedAspectRatio;
    } else {
      // else, calculate the size so its not greater than the image height
      newSize.width = width;
      newSize.height = width / fixedAspectRatio;
    }
    // Set the size of the crop overlay
    setCropSize(newSize);
    setAccumluatedPan({
      x: 0,
      y: imageBounds.height / 2 - newSize.height / 2,
    });
    return () => {
      setAccumluatedPan({
        x: 0,
        y: 0,
      });
    };
  }, [imageBounds]);

  // Function that sets which sections allow for translation when
  // pressed
  const isMovingSection = () => {
    return (
      selectedFrameSection == 'topmiddle' ||
      selectedFrameSection == 'middleleft' ||
      selectedFrameSection == 'middleright' ||
      selectedFrameSection == 'middlemiddle' ||
      selectedFrameSection == 'bottommiddle'
    );
  };

  const onOverlayMove = ({ nativeEvent }: PanGestureHandlerGestureEvent) => {
    if (selectedFrameSection !== '') {
      // Check if the section pressed is one to translate the crop window or not
      if (isMovingSection()) {
        // If it is then use an animated event to directly pass the tranlation
        // to the pan refs
        Animated.event(
          [
            {
              translationX: panX.current,
              translationY: panY.current,
            },
          ],
          { useNativeDriver: false },
        )(nativeEvent);
      } else {
      }
    } else {
      let position = 'middlemiddle';
      setSelectedFrameSection(position);
    }
  };

  const onOverlayRelease = (
    nativeEvent: PanGestureHandlerGestureEvent['nativeEvent'],
  ) => {
    // Check if the section pressed is one to translate the crop window or not
    if (isMovingSection()) {
      // Ensure the cropping overlay has not been moved outside of the allowed bounds
      checkCropBounds(nativeEvent);
    }
    // Disable the pan responder so the section tiles can register being pressed again
    setSelectedFrameSection('');
  };

  const onHandlerStateChange = ({
    nativeEvent,
  }: PanGestureHandlerGestureEvent) => {
    // Handle any state changes from the pan gesture handler
    // only looking at when the touch ends atm
    if (nativeEvent.state === State.END) {
      onOverlayRelease(nativeEvent);
    }
  };

  const checkCropBounds = ({
    translationX,
    translationY,
  }:
    | PanGestureHandlerGestureEvent['nativeEvent']
    | { translationX: number; translationY: number }) => {
    // Check if the pan in the x direction exceeds the bounds
    let accDx = accumulatedPan.x + translationX;
    // Is the new x pos less than zero?
    if (accDx <= imageBounds.x) {
      // Then set it to be zero and set the pan to zero too
      accDx = imageBounds.x;
    }
    // Is the new x pos plus crop width going to exceed the right hand bound
    else if (accDx + cropSize.width > imageBounds.width + imageBounds.x) {
      // Then set the x pos so the crop frame touches the right hand edge
      let limitedXPos = imageBounds.x + imageBounds.width - cropSize.width;
      accDx = limitedXPos;
    }
    // Check if the pan in the y direction exceeds the bounds
    let accDy = accumulatedPan.y + translationY;
    console.log({ accumulatedPanY: accumulatedPan.y, translationY });
    // Is the new y pos less the top edge?
    if (accDy <= imageBounds.y) {
      // Then set it to be zero and set the pan to zero too
      accDy = imageBounds.y;
    }
    // Is the new y pos plus crop height going to exceed the bottom bound
    else if (accDy + cropSize.height > imageBounds.height + imageBounds.y) {
      // Then set the y pos so the crop frame touches the bottom edge
      let limitedYPos = imageBounds.y + imageBounds.height - cropSize.height;
      accDy = limitedYPos;
    }
    // Record the accumulated pan and reset the pan refs to zero
    panX.current.setValue(0);
    panY.current.setValue(0);
    setAccumluatedPan({ x: accDx, y: accDy });
  };

  return (
    <View style={styles.container}>
      <PanGestureHandler
        onGestureEvent={onOverlayMove}
        onHandlerStateChange={(e) => onHandlerStateChange(e)}>
        <Animated.View
          style={[
            styles.overlay,
            animatedCropSize,
            {
              transform: [
                { translateX: Animated.add(panX.current, accumulatedPan.x) },
                { translateY: Animated.add(panY.current, accumulatedPan.y) },
              ],
            },
          ]}
        />
      </PanGestureHandler>
    </View>
  );
}

export { ImageCropOverlay };

const styles = StyleSheet.create({
  container: {
    height: '100%',
    width: '100%',
    position: 'absolute',
  },
  overlay: {
    height: 40,
    width: 40,
    backgroundColor: '#33333355',
    borderColor: '#ffffff88',
    borderWidth: 1,
  },
  sectionRow: {
    flexDirection: 'row',
    flex: 1,
  },
  defaultSection: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: '#ffffff88',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cornerMarker: {
    position: 'absolute',
    borderColor: '#ffffff',
    height: 30,
    width: 30,
  },
});
