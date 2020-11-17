"""
Maguire Lab - Deep Learning Seizure Detection WebApp
2020 - @matteocargnelutti (Software development) | @pantelisantonoudiou (Data Science)

app.py - Main entry point. Serves the app, processes EEG data input.
"""
#-------------------------------------------------------------------------------
# Imports
#-------------------------------------------------------------------------------
import json

from sklearn.preprocessing import StandardScaler
from tensorflow.keras.models import load_model
from flask import Flask, request, jsonify, render_template, redirect
import flask_compress
import numpy as np

#-------------------------------------------------------------------------------
# Load model
#-------------------------------------------------------------------------------
model = load_model('./models/single_channel_nov_17_2020.h5')

#-------------------------------------------------------------------------------
# Initiate Flask app
#-------------------------------------------------------------------------------
app = Flask(__name__)

# Redirect all HTTP traffic to HTTPS if the app is not run locally
@app.before_request
def https_redirect():
    if __name__ != '__main__' and request.url.startswith('http://'):
        url = request.url.replace('http://', 'https://', 1)
        return redirect(url, code=301)

# Add Security-related headers to every request
@app.after_request
def security_headers(response):
    response.headers['Strict-Transport-Security'] = 'max-age=10886400'
    response.headers['X-Frame-Options'] = 'deny'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Content-Security-Policy']: "default-src 'self' *.unpkg.com"
    return response

# Compress output using gzip / brotli
flask_compress.Compress(app)

#-------------------------------------------------------------------------------
# Route: Prediction
#-------------------------------------------------------------------------------
@app.route('/predict', methods=['POST'])
def predict():
    """
    [POST] /predict 
    
    - Takes up to 36 sequences of 500 samples (100hz, downsampled)
    - Expects a application/json Content-Type
    - Runs predictions for each sequence
    - Returns HTTP 200 with a JSON array of booleans in case of success 
    - Returns HTTP 400 in case input data is not valid
    """
    try:
        #
        # Parse and check data
        #
        data = request.get_json()

        # Data must be a list
        if not isinstance(data, list):
            raise Exception('Parsed data must be a list')

        # Data cannot contain more than 36 items
        if len(data) > 36:
            raise Exception('Too many sequences given')

        # Each row must contain up to 500 items
        for row in data:
            if not isinstance(row, list) or len(row) > 500:
                raise Exception('Too many samples given for sequence')

        #
        # Run preditions
        #
        data = np.array(data)
        data = data.reshape(data.shape[0], data.shape[1], 1) # Reshape as 3D to fit model
        predictions = model.predict(data) # Run predictions
        
        #
        # Sort predictions and prepare output data
        #
        output = []

        for prediction in predictions:
            if prediction[1] > prediction[0]:
                output.append(True)
            else:
                output.append(False)

        return jsonify(output)

    #
    # Catch-all
    #
    except Exception as err:
        print(err) # Will be logged by Papertrail
        return '', 400


#-------------------------------------------------------------------------------
# Route: Serve the app
#-------------------------------------------------------------------------------
@app.route('/', methods=['GET'])
def serve_app():
    """
    Serves the app's index.html.

    Notes:
    ------
    - If the app is run in dev mode, the app's static files will be rebuilt on the fly
    """
    # Rebuild the app's bundle if in dev mode
    if __name__ == "__main__":
        from build import bundle_javascript, bundle_css
        bundle_css()
        bundle_javascript()

    return render_template('index.html')

#-------------------------------------------------------------------------------
# Development mode
#-------------------------------------------------------------------------------
if __name__ == '__main__':
    app.run(debug=True)
