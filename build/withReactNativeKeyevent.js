"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_plugins_1 = require("@expo/config-plugins");
const generateCode_1 = require("@expo/config-plugins/build/utils/generateCode");
const withIosAppDelegateImport = (config) => {
    return (0, config_plugins_1.withAppDelegate)(config, (config) => {
        const contents = config.modResults.contents;
        // Detect if this is Swift or Objective-C
        const isSwift = contents.includes('@UIApplicationMain') && contents.includes('public class AppDelegate');
        if (isSwift) {
            // Swift AppDelegate - add import at the top
            const result = (0, generateCode_1.mergeContents)({
                tag: 'react-native-keyevent-import',
                src: contents,
                newSrc: 'import RNKeyEvent',
                anchor: 'import Expo',
                offset: 1,
                comment: '//',
            });
            if (!result.didMerge) {
                throw new Error('Could not add KeyEvent import to Swift AppDelegate');
            }
            config.modResults.contents = result.contents;
        }
        else {
            // Objective-C AppDelegate
            const result = (0, generateCode_1.mergeContents)({
                tag: 'react-native-keyevent-import',
                src: contents,
                newSrc: '#import <RNKeyEvent.h>',
                anchor: '#import "AppDelegate.h"',
                offset: 1,
                comment: '//',
            });
            if (!result.didMerge) {
                throw new Error('Could not add KeyEvent import to Objective-C AppDelegate');
            }
            config.modResults.contents = result.contents;
        }
        return config;
    });
};
const withIosAppDelegateBody = (config) => {
    return (0, config_plugins_1.withAppDelegate)(config, (config) => {
        const contents = config.modResults.contents;
        // Detect if this is Swift or Objective-C
        const isSwift = contents.includes('@UIApplicationMain') && contents.includes('public class AppDelegate');
        if (isSwift) {
            // Swift AppDelegate
            const swiftSrc = [
                '  var keyEvent: RNKeyEvent?',
                '',
                '  override var keyCommands: [UIKeyCommand]? {',
                '    var keys: [UIKeyCommand] = []',
                '',
                '    if keyEvent == nil {',
                '      keyEvent = RNKeyEvent()',
                '    }',
                '',
                '    if let keyEvent = keyEvent, keyEvent.isListening() {',
                '      let namesArray = keyEvent.getKeys().components(separatedBy: ",")',
                '      let validChars = CharacterSet(charactersIn: "ABCDEFGHIJKLMNOPQRSTUVWXYZ")',
                '',
                '      for names in namesArray {',
                '        if names.rangeOfCharacter(from: validChars) != nil {',
                '          keys.append(UIKeyCommand(input: names, modifierFlags: .shift, action: #selector(keyInput(_:))))',
                '        } else {',
                '          keys.append(UIKeyCommand(input: names, modifierFlags: [], action: #selector(keyInput(_:))))',
                '        }',
                '      }',
                '    }',
                '',
                '    return keys',
                '  }',
                '',
                '  @objc func keyInput(_ sender: UIKeyCommand) {',
                '    if let selected = sender.input {',
                '      keyEvent?.sendKeyEvent(selected)',
                '    }',
                '  }',
            ];
            const result = (0, generateCode_1.mergeContents)({
                tag: 'react-native-keyevent-body',
                src: contents,
                newSrc: swiftSrc.join('\n'),
                anchor: 'public class AppDelegate: ExpoAppDelegate {',
                offset: 1,
                comment: '//',
            });
            if (!result.didMerge) {
                throw new Error('Could not add KeyEvent body to Swift AppDelegate');
            }
            config.modResults.contents = result.contents;
        }
        else {
            // Objective-C AppDelegate
            const objcSrc = [
                'RNKeyEvent *keyEvent = nil;',
                '',
                '- (NSMutableArray<UIKeyCommand *> *)keyCommands {',
                '  NSMutableArray *keys = [NSMutableArray new];',
                '',
                '  if (keyEvent == nil) {',
                '    keyEvent = [[RNKeyEvent alloc] init];',
                '  }',
                '',
                '  if ([keyEvent isListening]) {',
                '    NSArray *namesArray = [[keyEvent getKeys] componentsSeparatedByString:@","];',
                '',
                '    NSCharacterSet *validChars = [NSCharacterSet characterSetWithCharactersInString:@"ABCDEFGHIJKLMNOPQRSTUVWXYZ"];',
                '',
                '    for (NSString* names in namesArray) {',
                '      NSRange range = [names rangeOfCharacterFromSet:validChars];',
                '',
                '      if (NSNotFound != range.location) {',
                '        [keys addObject:[UIKeyCommand keyCommandWithInput:names modifierFlags:UIKeyModifierShift action:@selector(keyInput:)]];',
                '      } else {',
                '        [keys addObject:[UIKeyCommand keyCommandWithInput:names modifierFlags:0 action:@selector(keyInput:)]];',
                '      }',
                '    }',
                '  }',
                '',
                '  return keys;',
                '}',
                '',
                '- (void)keyInput:(UIKeyCommand *)sender {',
                '  NSString *selected = sender.input;',
                '  [keyEvent sendKeyEvent:selected];',
                '}',
            ];
            const result = (0, generateCode_1.mergeContents)({
                tag: 'react-native-keyevent-body',
                src: contents,
                newSrc: objcSrc.join('\n'),
                anchor: '@implementation AppDelegate',
                offset: 1,
                comment: '//',
            });
            if (!result.didMerge) {
                throw new Error('Could not add KeyEvent body to Objective-C AppDelegate');
            }
            config.modResults.contents = result.contents;
        }
        return config;
    });
};
const withAndroidMainActivityImport = (config) => {
    return (0, config_plugins_1.withMainActivity)(config, (config) => {
        const result = (0, generateCode_1.mergeContents)({
            tag: 'react-native-keyevent-import',
            src: config.modResults.contents,
            newSrc: ['import android.view.KeyEvent', 'import com.github.kevinejohn.keyevent.KeyEventModule'].join('\n'),
            anchor: 'import',
            offset: 1,
            comment: '//',
        });
        if (!result.didMerge) {
            throw new Error('Could not add KeyEvent imports to MainActivity.kt');
        }
        config.modResults.contents = result.contents;
        return config;
    });
};
const withAndroidMainActivityBody = (config) => {
    return (0, config_plugins_1.withMainActivity)(config, (config) => {
        const newSrc = [
            'override fun onKeyDown(keyCode: Int, event: KeyEvent): Boolean {',
            '    // Uncomment to trigger once on key down',
            '    // if (event.repeatCount == 0) {',
            '    //     KeyEventModule.getInstance().onKeyDownEvent(keyCode, event)',
            '    // }',
            '',
            '    // Trigger on every key repeat',
            '    KeyEventModule.getInstance().onKeyDownEvent(keyCode, event)',
            '',
            '    // Uncomment for default keyboard behavior',
            '    // return super.onKeyDown(keyCode, event)',
            '',
            '    // Override default',
            '    return true',
            '}',
            '',
            'override fun onKeyUp(keyCode: Int, event: KeyEvent?): Boolean {',
            '    if (event != null) {',
            '        KeyEventModule.getInstance().onKeyUpEvent(keyCode, event)',
            '    }',
            '',
            '    // Uncomment for default keyboard behavior',
            '    // return super.onKeyUp(keyCode, event)',
            '',
            '    return true',
            '}',
            '',
            'override fun onKeyMultiple(keyCode: Int, repeatCount: Int, event: KeyEvent?): Boolean {',
            '    if (event != null) {',
            '        KeyEventModule.getInstance().onKeyMultipleEvent(keyCode, repeatCount, event)',
            '    }',
            '    return super.onKeyMultiple(keyCode, repeatCount, event)',
            '}',
        ];
        const result = (0, generateCode_1.mergeContents)({
            tag: 'react-native-keyevent-body',
            src: config.modResults.contents,
            newSrc: newSrc.join('\n'),
            anchor: 'class MainActivity',
            offset: 1,
            comment: '//',
        });
        if (!result.didMerge) {
            throw new Error('Could not add KeyEvent body to MainActivity.kt');
        }
        config.modResults.contents = result.contents;
        return config;
    });
};
const withKeyEvent = (config) => {
    config = withIosAppDelegateImport(config);
    config = withIosAppDelegateBody(config);
    config = withAndroidMainActivityImport(config);
    config = withAndroidMainActivityBody(config);
    return config;
};
exports.default = withKeyEvent;