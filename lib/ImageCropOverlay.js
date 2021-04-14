"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageCropOverlay = void 0;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
const recoil_1 = require("recoil");
const Store_1 = require("./Store");
const react_native_gesture_handler_1 = require("react-native-gesture-handler");
// const horizontalSections = ['top', 'middle', 'bottom'];
const horizontalSections = [];
const verticalSections = ['left', 'middle', 'right'];
function ImageCropOverlay() {
    // Record which section of the fram window has been pressed
    // this determines whether it is a translation or scaling gesture
    const [selectedFrameSection, setSelectedFrameSection] = React.useState('');
    // Shared state and bits passed through recoil to avoid prop drilling
    const [cropSize, setCropSize] = recoil_1.useRecoilState(Store_1.cropSizeState);
    const [imageBounds] = recoil_1.useRecoilState(Store_1.imageBoundsState);
    const panX = React.useRef(new react_native_1.Animated.Value(imageBounds.x));
    const panY = React.useRef(new react_native_1.Animated.Value(imageBounds.y));
    const [accumulatedPan, setAccumluatedPan] = React.useState({ x: 0, y: 0 });
    const [fixedAspectRatio] = recoil_1.useRecoilState(Store_1.fixedCropAspectRatioState);
    const [animatedCropSize] = React.useState({
        width: new react_native_1.Animated.Value(cropSize.width),
        height: new react_native_1.Animated.Value(cropSize.height),
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
        }
        else {
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
        return (selectedFrameSection == 'topmiddle' ||
            selectedFrameSection == 'middleleft' ||
            selectedFrameSection == 'middleright' ||
            selectedFrameSection == 'middlemiddle' ||
            selectedFrameSection == 'bottommiddle');
    };
    const onOverlayMove = ({ nativeEvent }) => {
        if (selectedFrameSection !== '') {
            // Check if the section pressed is one to translate the crop window or not
            if (isMovingSection()) {
                // If it is then use an animated event to directly pass the tranlation
                // to the pan refs
                react_native_1.Animated.event([
                    {
                        translationX: panX.current,
                        translationY: panY.current,
                    },
                ], { useNativeDriver: false })(nativeEvent);
            }
            else {
            }
        }
        else {
            let position = 'middlemiddle';
            setSelectedFrameSection(position);
        }
    };
    const onOverlayRelease = (nativeEvent) => {
        // Check if the section pressed is one to translate the crop window or not
        if (isMovingSection()) {
            // Ensure the cropping overlay has not been moved outside of the allowed bounds
            checkCropBounds(nativeEvent);
        }
        // Disable the pan responder so the section tiles can register being pressed again
        setSelectedFrameSection('');
    };
    const onHandlerStateChange = ({ nativeEvent, }) => {
        // Handle any state changes from the pan gesture handler
        // only looking at when the touch ends atm
        if (nativeEvent.state === react_native_gesture_handler_1.State.END) {
            onOverlayRelease(nativeEvent);
        }
    };
    const checkCropBounds = ({ translationX, translationY, }) => {
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
    return (<react_native_1.View style={styles.container}>
      <react_native_gesture_handler_1.PanGestureHandler onGestureEvent={onOverlayMove} onHandlerStateChange={(e) => onHandlerStateChange(e)}>
        <react_native_1.Animated.View style={[
        styles.overlay,
        animatedCropSize,
        {
            transform: [
                { translateX: react_native_1.Animated.add(panX.current, accumulatedPan.x) },
                { translateY: react_native_1.Animated.add(panY.current, accumulatedPan.y) },
            ],
        },
    ]}/>
      </react_native_gesture_handler_1.PanGestureHandler>
    </react_native_1.View>);
}
exports.ImageCropOverlay = ImageCropOverlay;
const styles = react_native_1.StyleSheet.create({
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
//# sourceMappingURL=ImageCropOverlay.js.map