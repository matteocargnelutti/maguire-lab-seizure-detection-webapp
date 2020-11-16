"""
Maguire Lab - Deep Learning Seizure Detection WebApp
2020 - @matteocargnelutti (Software development) | @pantelisantonoudiou (Data Science)

build.py - Builds the webapp's JavaScript and CSS bundle files.
"""
#-------------------------------------------------------------------------------
# Imports
#-------------------------------------------------------------------------------
from glob import glob 

from jsmin import jsmin
import csscompressor

#-------------------------------------------------------------------------------
# File-level constants
#-------------------------------------------------------------------------------
CSS_INPUT_PATH = './webapp/**/*.js'
CSS_OUTPUT_PATH = './static/bundle.js'

JS_INPUT_PATH = './webapp/**/*.css'
JS_OUTPUT_PATH = './static/bundle.css'

#-------------------------------------------------------------------------------
# Javascript bundler
#-------------------------------------------------------------------------------
def bundle_javascript():
    """
    Reads through .js files from the webapp folder and merges them into a single file, bundle.js.
    Minifies files in the process.

    Returns
    -------
    bool
    """
    input_path = CSS_INPUT_PATH
    output_path = CSS_OUTPUT_PATH
    output_js = ''

    for filename in glob(input_path, recursive=True):
        with open(filename, 'r') as file:
            output_js += jsmin(file.read(), quote_chars="'\"`") + '\n'

    with open(output_path, 'w') as file:
        file.write(output_js)

    return True

#-------------------------------------------------------------------------------
# CSS bundler
#-------------------------------------------------------------------------------
def bundle_css():
    """
    Reads through .css files from the webapp folder and merges them into a single file, bundle.js.
    Minifies files in the process.

    Returns
    -------
    bool
    """
    input_path = JS_INPUT_PATH
    output_path = JS_OUTPUT_PATH
    output_css = ''

    for filename in glob(input_path, recursive=True):
        with open(filename, 'r') as file:
            output_css += csscompressor.compress(file.read()) + '\n'

    with open(output_path, 'w') as file:
        file.write(output_css)

    return True

#-------------------------------------------------------------------------------
# Run if script called directly
#-------------------------------------------------------------------------------
if __name__ == "__main__":
    bundle_javascript()
    bundle_css()
    print('App files built.')
