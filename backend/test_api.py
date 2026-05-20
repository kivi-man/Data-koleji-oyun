"""
API Test Script
Tests all backend endpoints
"""
import requests
import json

BASE_URL = 'http://127.0.0.1:5000'

def test_health():
    """Test health endpoint"""
    print("\n=== Testing Health Endpoint ===")
    response = requests.get(f'{BASE_URL}/health')
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    return response.status_code == 200

def test_register():
    """Test user registration"""
    print("\n=== Testing User Registration ===")
    data = {
        'username': 'testuser',
        'email': 'test@test.com',
        'password': 'test123'
    }
    response = requests.post(f'{BASE_URL}/api/auth/register', json=data)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    return response.status_code in [200, 201, 400]  # 400 if user exists

def test_login():
    """Test user login"""
    print("\n=== Testing User Login ===")
    data = {
        'username': 'testuser',
        'password': 'test123'
    }
    response = requests.post(f'{BASE_URL}/api/auth/login', json=data)
    print(f"Status: {response.status_code}")
    result = response.json()
    print(f"Response: {result}")
    
    if response.status_code == 200:
        return result.get('access_token')
    return None

def test_profile(token):
    """Test get profile"""
    print("\n=== Testing Get Profile ===")
    headers = {'Authorization': f'Bearer {token}'}
    response = requests.get(f'{BASE_URL}/api/auth/profile', headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    return response.status_code == 200

def test_create_save(token):
    """Test create save"""
    print("\n=== Testing Create Save ===")
    headers = {'Authorization': f'Bearer {token}'}
    data = {
        'save_name': 'Test Save 1',
        'x': 768.0,
        'y': 1054.0,
        'health': 100,
        'scene': 'game',
        'player_combo': 0,
        'player_has_adrenaline': False,
        'timestamp': 13218
    }
    response = requests.post(f'{BASE_URL}/api/saves', json=data, headers=headers)
    print(f"Status: {response.status_code}")
    result = response.json()
    print(f"Response: {result}")
    
    if response.status_code in [200, 201]:
        return result.get('save_id')
    return None

def test_list_saves(token):
    """Test list saves"""
    print("\n=== Testing List Saves ===")
    headers = {'Authorization': f'Bearer {token}'}
    response = requests.get(f'{BASE_URL}/api/saves', headers=headers)
    print(f"Status: {response.status_code}")
    result = response.json()
    print(f"Response: {json.dumps(result, indent=2)}")
    return response.status_code == 200

def test_submit_score(token):
    """Test submit score"""
    print("\n=== Testing Submit Score ===")
    headers = {'Authorization': f'Bearer {token}'}
    data = {
        'score': 1000,
        'playtime': 300,
        'enemies_defeated': 10,
        'scenes_completed': 5
    }
    response = requests.post(f'{BASE_URL}/api/leaderboard', json=data, headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    return response.status_code in [200, 201]

def test_get_leaderboard():
    """Test get leaderboard"""
    print("\n=== Testing Get Leaderboard ===")
    response = requests.get(f'{BASE_URL}/api/leaderboard')
    print(f"Status: {response.status_code}")
    result = response.json()
    print(f"Response: {json.dumps(result, indent=2)}")
    return response.status_code == 200

def test_leaderboard_stats():
    """Test leaderboard stats"""
    print("\n=== Testing Leaderboard Stats ===")
    response = requests.get(f'{BASE_URL}/api/leaderboard/stats')
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    return response.status_code == 200

def main():
    """Run all tests"""
    print("="*60)
    print("DATA AGENTS API TEST SUITE")
    print("="*60)
    
    try:
        # Test health
        if not test_health():
            print("\n❌ Health check failed! Is the server running?")
            return
        
        # Test registration
        test_register()
        
        # Test login
        token = test_login()
        if not token:
            print("\n❌ Login failed!")
            return
        
        print(f"\n✅ Got access token: {token[:20]}...")
        
        # Test profile
        test_profile(token)
        
        # Test create save
        save_id = test_create_save(token)
        if save_id:
            print(f"\n✅ Created save with ID: {save_id}")
        
        # Test list saves
        test_list_saves(token)
        
        # Test submit score
        test_submit_score(token)
        
        # Test get leaderboard
        test_get_leaderboard()
        
        # Test leaderboard stats
        test_leaderboard_stats()
        
        print("\n" + "="*60)
        print("✅ ALL TESTS COMPLETED!")
        print("="*60)
        
    except requests.exceptions.ConnectionError:
        print("\n❌ Connection error! Make sure the server is running on http://127.0.0.1:5000")
    except Exception as e:
        print(f"\n❌ Error: {e}")

if __name__ == '__main__':
    main()
