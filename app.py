import csv
import json
from flask import Flask, render_template, request, redirect, jsonify, session
from datetime import timedelta
from flask_toastr import Toastr
from src.qdrant_bagatelle_store_client import query_image_collection, ask_llm_about_artworks
import os
import logging
from dotenv import load_dotenv

# log = logging.getLogger('werkzeug')
# log.setLevel(logging.ERROR)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_app():
    if not os.getenv("BAGATELLE_SECRET_KEY"):
        logger.info("🔍 BAGATELLE_SECRET_KEY not found in environment — trying to load from .env")
        load_dotenv()
    if not os.getenv("BAGATELLE_SECRET_KEY"):
        logger.error("❌ Configuration error: BAGATELLE_SECRET_KEY not found in environment or .env file.")
        raise RuntimeError(
            "Configuration error: BAGATELLE_SECRET_KEY not found. "
            "Please set it as an environment variable or in your .env file."
        )
    app = Flask(__name__)
    app.config['SESSION_PERMANENT'] = True
    app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=24)
    app.secret_key = os.getenv("BAGATELLE_SECRET_KEY")
    logger.info("✅ Flask app created successfully with loaded configuration.")
    return app

app =create_app()
toastr = Toastr(app)

def load_bagatelle_file_list():
    file_name = os.path.join('static', 'data', 'file_list_html.csv')
    images = []
    with open(file_name, 'r') as csv_file:
        reader = csv.reader(csv_file, delimiter=',')
        next(reader, None)
        for row in reader:
            images.append({"name": row[0], "category": row[1], "link": row[2]})
    return images

@app.route('/')
def home():
    bagatelle_data = load_bagatelle_file_list()
    return render_template('image_gallery.html', bagatelle_data=json.dumps(bagatelle_data))

@app.route('/retrieve', methods=['POST'])
def retrieve():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "No JSON payload received"}), 400
    question = data.get("question")
    try:
        top_k = int(data.get("k", 3))
    except (TypeError, ValueError):
        top_k = 3

    response = []
    if question:
        try:
            response = query_image_collection(question, top_k)
            # response = query_image_and_text_collection(question, top_k)
            return jsonify({"response": response})
        except Exception as e:
            print(e)
            return jsonify({"response": response, "error": "Model failed to run!"})
    return jsonify({"response": response, "error": "Invalid request!"})

@app.route('/ask_llm', methods=['POST'])
def ask_llm():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"answer": "No JSON payload received"}), 400
    question = data.get("question")
    context = data.get("context")
    print("Image context:", context)
    if question:
        try:
            resp = ask_llm_about_artworks(question, context)
            return jsonify({"response": resp})
        except Exception as e:
            print(e)
            return jsonify({"response": "Model failed to run!"})
    else:
        return jsonify({"response": "No question received"}), 400

@app.route('/back')
def back():
    """
    A button to redirect back to the main page
    :return:
    """
    return redirect('/')


if __name__ == '__main__':
    app.run()
    app.app_context().push()
    # session.pop('logged_in', None)
