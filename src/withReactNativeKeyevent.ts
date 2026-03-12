import { ConfigPlugin, withAppDelegate, withMainActivity, withDangerousMod, withXcodeProject } from '@expo/config-plugins';
import { mergeContents } from '@expo/config-plugins/build/utils/generateCode';
import * as path from 'path';
import * as fs from 'fs';

const BRIDGING_HEADER_IMPORT = '#import <RNKeyEvent.h>';

const withIosAppDelegateImport: ConfigPlugin = (config) => {
    return withAppDelegate(config, (config) => {
        const contents = config.modResults.contents;
        const isSwift = config.modResults.language === 'swift';

        if (isSwift) {
            // Swift uses a bridging header for Obj-C imports (handled by withIosBridgingHeader)
            return config;
        } else {
            // Objective-C AppDelegate
            const result = mergeContents({
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

const withIosAppDelegateBody: ConfigPlugin = (config) => {
    return withAppDelegate(config, (config) => {
        const contents = config.modResults.contents;
        const isSwift = config.modResults.language === 'swift';

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

            const result = mergeContents({
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
        } else {
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

            const result = mergeContents({
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

const withIosBridgingHeader: ConfigPlugin = (config) => {
    // Create or modify the bridging header file
    config = withDangerousMod(config, ['ios', (config) => {
        const platformProjectRoot = config.modRequest.platformProjectRoot;
        const projectName = config.modRequest.projectName!;

        // Only create bridging header for Swift projects
        const appDelegatePath = path.join(platformProjectRoot, projectName, 'AppDelegate.swift');
        if (!fs.existsSync(appDelegatePath)) {
            return config;
        }

        const bridgingHeaderFileName = `${projectName}-Bridging-Header.h`;
        const bridgingHeaderPath = path.join(platformProjectRoot, projectName, bridgingHeaderFileName);

        if (fs.existsSync(bridgingHeaderPath)) {
            // Bridging header exists - add import if not already present
            const contents = fs.readFileSync(bridgingHeaderPath, 'utf-8');
            if (!contents.includes(BRIDGING_HEADER_IMPORT)) {
                fs.writeFileSync(bridgingHeaderPath, contents.trimEnd() + '\n' + BRIDGING_HEADER_IMPORT + '\n');
            }
        } else {
            // Create a new bridging header
            const headerContent = [
                '//',
                `//  ${bridgingHeaderFileName}`,
                `//  ${projectName}`,
                '//',
                '',
                BRIDGING_HEADER_IMPORT,
                '',
            ].join('\n');
            fs.mkdirSync(path.dirname(bridgingHeaderPath), { recursive: true });
            fs.writeFileSync(bridgingHeaderPath, headerContent);
        }

        return config;
    }]);

    // Ensure Xcode project references the bridging header
    config = withXcodeProject(config, (config) => {
        const projectName = config.modRequest.projectName!;
        const bridgingHeaderValue = `${projectName}/${projectName}-Bridging-Header.h`;
        const project = config.modResults;
        const configurations = project.pbxXCBuildConfigurationSection();

        for (const key in configurations) {
            const entry = configurations[key];
            if (typeof entry === 'object' && entry.buildSettings) {
                // Only modify app target configurations (identified by INFOPLIST_FILE)
                if (entry.buildSettings.INFOPLIST_FILE && !entry.buildSettings.SWIFT_OBJC_BRIDGING_HEADER) {
                    entry.buildSettings.SWIFT_OBJC_BRIDGING_HEADER = `"${bridgingHeaderValue}"`;
                }
            }
        }

        return config;
    });

    return config;
};

const withAndroidMainActivityImport: ConfigPlugin = (config) => {
    return withMainActivity(config, (config) => {
        const result = mergeContents({
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

const withAndroidMainActivityBody: ConfigPlugin = (config) => {
    return withMainActivity(config, (config) => {
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

        const result = mergeContents({
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

const withKeyEvent: ConfigPlugin = (config) => {
    config = withIosAppDelegateImport(config);
    config = withIosBridgingHeader(config);
    config = withIosAppDelegateBody(config);
    config = withAndroidMainActivityImport(config);
    config = withAndroidMainActivityBody(config);
    return config;
};

export default withKeyEvent;