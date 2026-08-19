import os
import json
from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
from PIL import Image
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import load_model

app = Flask(__name__)

# Configuration
MODEL_PATH = 'plant_disease_model.h5'
CLASSES_PATH = 'class_names.json'
UPLOAD_FOLDER = 'temp_uploads'

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Global variables for model and classes
model = None
class_names = {}

def load_ai_assets():
    global model, class_names
    if os.path.exists(MODEL_PATH) and os.path.exists(CLASSES_PATH):
        print(f"Loading model from {MODEL_PATH}...")
        model = load_model(MODEL_PATH)
        
        with open(CLASSES_PATH, 'r') as f:
            class_names_dict = json.load(f)
            # JSON keys are strings, but our model outputs integer indices. Convert keys to int.
            class_names = {int(k): v for k, v in class_names_dict.items()}
        print("✅ AI Model and Classes loaded successfully!")
    else:
        print("⚠️ WARNING: AI Model not found. You must run train.py first!")

def generate_recommendation(disease_name):
    disease_lower = disease_name.lower()
    
    if 'healthy' in disease_lower:
        return "Plant is healthy and showing vigorous foliage. Maintain regular drip irrigation, monitor soil moisture, and continue routine weed and nutrient management."
    elif 'insect' in disease_lower or 'pest' in disease_lower:
        return "Insect pest damage detected (e.g., shoot borers, aphids, or flea beetles). Prune and destroy infested shoots. Spray organic neem oil (2-3%) or use recommended biological insecticides (e.g., Bacillus thuringiensis) early in the morning."
    elif 'spot' in disease_lower:
        return "Fungal leaf spot detected (Cercospora/Alternaria). Remove infected lower leaves to prevent spore splash. Avoid overhead watering to keep foliage dry, and apply a copper-based or Mancozeb fungicide."
    elif 'mosaic' in disease_lower:
        return "Mosaic virus detected. Viruses cannot be cured once inside the plant. Remove and safely dispose of infected plants immediately. Control sap-sucking insect vectors (aphids/whiteflies) using yellow sticky traps or insecticidal soap."
    elif 'small leaf' in disease_lower or 'little leaf' in disease_lower:
        return "Little Leaf Disease detected (caused by phytoplasma). Uproot and discard severely stunted plants. Control leafhopper insect vectors by applying systemic insecticides (like Dimethoate) or neem-based sprays."
    elif 'white mold' in disease_lower or 'mold' in disease_lower:
        return "White mold fungus detected (Sclerotinia). Immediately prune affected stems and clean up fallen plant debris. Reduce soil moisture, increase sunlight exposure, and apply a bio-fungicide (Trichoderma) around the base."
    elif 'wilt' in disease_lower:
        return "Wilt disease detected (bacterial or fungal vascular blockage). Remove wilted plants along with root soil to prevent spread. Ensure proper field drainage, avoid over-irrigation, and treat root zones with copper oxychloride."
    else:
        return "Crop anomaly detected. Isolate affected leaves, sanitize farm tools, ensure proper soil drainage, and consult a local agricultural extension specialist."

@app.route('/predict', methods=['POST'])
def predict():
    if model is None:
        return jsonify({"error": "AI Model is not loaded. Train the model first using train.py."}), 500
        
    if 'image' not in request.files:
        return jsonify({"error": "No image part in the request"}), 400
        
    file = request.files['image']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
        
    if file:
        filename = secure_filename(file.filename)
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        
        try:
            # Preprocess the image exactly how it was trained
            img = Image.open(filepath).convert('RGB')
            img = img.resize((224, 224))
            img_array = np.array(img) / 255.0  # Normalize to 0-1
            img_array = np.expand_dims(img_array, axis=0) # Add batch dimension
            
            # Predict
            predictions = model.predict(img_array)
            predicted_class_idx = np.argmax(predictions[0])
            confidence = float(predictions[0][predicted_class_idx])
            
            disease_name = class_names.get(predicted_class_idx, "Unknown")
            
            # Format output for Agri-Guard
            is_healthy = 'healthy' in disease_name.lower()
            status = "healthy" if is_healthy else "attention_needed"
            recommendation = generate_recommendation(disease_name)
            
            # Cleanup temp file
            os.remove(filepath)
            
            return jsonify({
                "status": status,
                "disease": disease_name,
                "recommendation": recommendation,
                "confidence": confidence
            })
            
        except Exception as e:
            if os.path.exists(filepath):
                os.remove(filepath)
            return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    load_ai_assets()
    # Run on port 5000 so it doesn't conflict with XAMPP (Port 80)
    print("🚀 Starting Local AI Server on http://127.0.0.1:5000")
    app.run(host='127.0.0.1', port=5000, debug=False)
