# Unity Avatar Viseme Mapping Guide

## Overview

This document provides the complete mapping from Azure TTS Viseme IDs (0-21) to ARKit blend shape names for Unity avatar lip-sync animation in VaktaAI.

## Architecture Flow

```
Azure TTS (Server) → voiceService → optimizedTutor API → React → Unity WebGL iframe
```

**Current Data Format from Server:**
```json
{
  "time": 50,
  "blendshape": "viseme_0",
  "weight": 1.0
}
```

**Unity Avatar Blend Shapes:** 155 ARKit-compatible blend shapes (jawOpen, mouthPucker, mouthSmileLeft, etc.)

## The Problem

Unity receives `viseme_0` to `viseme_21` but the avatar's SkinnedMeshRenderer expects ARKit blend shape names like `jawOpen`, `mouthPucker`, etc. Without mapping, no lip movement occurs.

## Complete Viseme to ARKit Blend Shape Mapping

### Viseme ID Reference Table

| Viseme ID | Phonemes | Description | Example Words |
|-----------|----------|-------------|---------------|
| 0 | silence | Neutral/closed mouth | (pause) |
| 1 | æ, ə, ʌ | Open relaxed | "cat", "about" |
| 2 | ɑ | Wide open | "father" |
| 3 | ɔ | Rounded open | "thought" |
| 4 | eɪ, ɛ, ʊ | Slight open | "say", "bet" |
| 5 | ɝ | R-colored vowel | "bird" |
| 6 | j, i, ɪ | Smile/spread | "yes", "see" |
| 7 | w, u | Rounded/pucker | "we", "you" |
| 8 | oʊ | O-shape | "go" |
| 9 | aʊ | Open rounded | "how" |
| 10 | ɔɪ | Diphthong | "boy" |
| 11 | aɪ | Wide diphthong | "my" |
| 12 | h | Aspirated | "he" |
| 13 | ɹ | R-sound | "red" |
| 14 | l | L-sound | "let" |
| 15 | s, z | S/Z fricatives | "see", "zoo" |
| 16 | ʃ, tʃ, dʒ, ʒ | Sh/Ch sounds | "she", "check" |
| 17 | θ, ð | Th sounds | "think", "the" |
| 18 | f, v | Labiodental | "fee", "vee" |
| 19 | d, t, n | Dental/alveolar | "day", "no" |
| 20 | k, g, ŋ | Velar | "go", "king" |
| 21 | p, b, m | Bilabial | "pop", "mom" |

### Unity C# Mapping Implementation

```csharp
using System.Collections.Generic;
using UnityEngine;

public class VisemeToARKitMapper : MonoBehaviour
{
    // Mapping from Azure Viseme ID to ARKit blend shapes with weights (0-100)
    private static readonly Dictionary<int, Dictionary<string, float>> VisemeMapping = new()
    {
        // Viseme 0: Silence - neutral closed mouth
        { 0, new Dictionary<string, float> {
            { "mouthClose", 100f },
            { "jawOpen", 0f }
        }},
        
        // Viseme 1: æ, ə, ʌ (cat, about, up) - open relaxed mouth
        { 1, new Dictionary<string, float> {
            { "jawOpen", 60f },
            { "mouthStretchLeft", 40f },
            { "mouthStretchRight", 40f }
        }},
        
        // Viseme 2: ɑ (father) - wide open mouth
        { 2, new Dictionary<string, float> {
            { "jawOpen", 85f },
            { "mouthStretchLeft", 45f },
            { "mouthStretchRight", 45f }
        }},
        
        // Viseme 3: ɔ (thought, all) - rounded open
        { 3, new Dictionary<string, float> {
            { "jawOpen", 60f },
            { "mouthFunnel", 40f }
        }},
        
        // Viseme 4: eɪ, ɛ, ʊ (say, bet, put) - slight open
        { 4, new Dictionary<string, float> {
            { "jawOpen", 40f },
            { "mouthStretchLeft", 25f },
            { "mouthStretchRight", 25f }
        }},
        
        // Viseme 5: ɝ (bird, her) - R-colored vowel
        { 5, new Dictionary<string, float> {
            { "jawOpen", 35f },
            { "mouthFunnel", 30f },
            { "mouthPucker", 20f }
        }},
        
        // Viseme 6: j, i, ɪ (yes, see, bit) - smile/spread lips
        { 6, new Dictionary<string, float> {
            { "mouthSmileLeft", 60f },
            { "mouthSmileRight", 60f },
            { "jawOpen", 10f }
        }},
        
        // Viseme 7: w, u (we, you, blue) - rounded pucker
        { 7, new Dictionary<string, float> {
            { "mouthPucker", 70f },
            { "mouthFunnel", 60f },
            { "jawOpen", 15f }
        }},
        
        // Viseme 8: oʊ (go, no) - O-shape
        { 8, new Dictionary<string, float> {
            { "mouthFunnel", 70f },
            { "jawOpen", 35f },
            { "mouthPucker", 30f }
        }},
        
        // Viseme 9: aʊ (how, now) - open rounded
        { 9, new Dictionary<string, float> {
            { "jawOpen", 70f },
            { "mouthFunnel", 40f },
            { "mouthStretchLeft", 20f },
            { "mouthStretchRight", 20f }
        }},
        
        // Viseme 10: ɔɪ (boy, toy) - diphthong
        { 10, new Dictionary<string, float> {
            { "jawOpen", 55f },
            { "mouthFunnel", 50f },
            { "mouthSmileLeft", 20f },
            { "mouthSmileRight", 20f }
        }},
        
        // Viseme 11: aɪ (my, hi) - wide diphthong
        { 11, new Dictionary<string, float> {
            { "jawOpen", 75f },
            { "mouthStretchLeft", 55f },
            { "mouthStretchRight", 55f }
        }},
        
        // Viseme 12: h (he, hello) - aspirated, slightly open
        { 12, new Dictionary<string, float> {
            { "jawOpen", 25f },
            { "mouthStretchLeft", 15f },
            { "mouthStretchRight", 15f }
        }},
        
        // Viseme 13: ɹ (red, run) - R-sound
        { 13, new Dictionary<string, float> {
            { "mouthFunnel", 35f },
            { "jawOpen", 20f },
            { "mouthPucker", 25f }
        }},
        
        // Viseme 14: l (let, all) - L-sound, tongue tip up
        { 14, new Dictionary<string, float> {
            { "jawOpen", 30f },
            { "mouthStretchLeft", 20f },
            { "mouthStretchRight", 20f }
        }},
        
        // Viseme 15: s, z (see, zoo) - teeth together, smile
        { 15, new Dictionary<string, float> {
            { "mouthSmileLeft", 40f },
            { "mouthSmileRight", 40f },
            { "jawOpen", 15f },
            { "mouthClose", 30f }
        }},
        
        // Viseme 16: ʃ, tʃ, dʒ, ʒ (she, check, judge) - rounded fricative
        { 16, new Dictionary<string, float> {
            { "mouthFunnel", 55f },
            { "mouthPucker", 45f },
            { "jawOpen", 20f }
        }},
        
        // Viseme 17: θ, ð (think, the) - tongue between teeth
        { 17, new Dictionary<string, float> {
            { "jawOpen", 20f },
            { "mouthLowerDownLeft", 30f },
            { "mouthLowerDownRight", 30f }
        }},
        
        // Viseme 18: f, v (fee, vee) - lower lip to upper teeth
        { 18, new Dictionary<string, float> {
            { "mouthLowerDownLeft", 65f },
            { "mouthLowerDownRight", 65f },
            { "mouthClose", 40f },
            { "jawOpen", 10f }
        }},
        
        // Viseme 19: d, t, n (day, tea, no) - tongue to alveolar ridge
        { 19, new Dictionary<string, float> {
            { "jawOpen", 25f },
            { "mouthStretchLeft", 20f },
            { "mouthStretchRight", 20f },
            { "mouthClose", 20f }
        }},
        
        // Viseme 20: k, g, ŋ (go, king, sing) - back of tongue raised
        { 20, new Dictionary<string, float> {
            { "jawOpen", 30f },
            { "mouthStretchLeft", 15f },
            { "mouthStretchRight", 15f }
        }},
        
        // Viseme 21: p, b, m (pop, bob, mom) - lips pressed together
        { 21, new Dictionary<string, float> {
            { "mouthClose", 100f },
            { "mouthPressLeft", 80f },
            { "mouthPressRight", 80f },
            { "jawOpen", 5f }
        }}
    };

    private SkinnedMeshRenderer faceMesh;
    private Dictionary<string, int> blendShapeIndices = new();

    void Start()
    {
        // Cache blend shape indices for performance
        faceMesh = GetComponent<SkinnedMeshRenderer>();
        if (faceMesh != null && faceMesh.sharedMesh != null)
        {
            for (int i = 0; i < faceMesh.sharedMesh.blendShapeCount; i++)
            {
                string name = faceMesh.sharedMesh.GetBlendShapeName(i);
                blendShapeIndices[name] = i;
            }
            Debug.Log($"[VisemeMapper] Cached {blendShapeIndices.Count} blend shapes");
        }
    }

    /// <summary>
    /// Apply a viseme to the avatar's blend shapes
    /// </summary>
    /// <param name="visemeId">Azure viseme ID (0-21)</param>
    public void ApplyViseme(int visemeId)
    {
        if (!VisemeMapping.TryGetValue(visemeId, out var blendShapes))
        {
            Debug.LogWarning($"[VisemeMapper] Unknown viseme ID: {visemeId}");
            return;
        }

        // Reset all mouth blend shapes first (optional, for cleaner transitions)
        ResetMouthBlendShapes();

        // Apply the blend shapes for this viseme
        foreach (var kvp in blendShapes)
        {
            if (blendShapeIndices.TryGetValue(kvp.Key, out int index))
            {
                faceMesh.SetBlendShapeWeight(index, kvp.Value);
            }
            else
            {
                Debug.LogWarning($"[VisemeMapper] Blend shape not found: {kvp.Key}");
            }
        }
    }

    /// <summary>
    /// Parse viseme string from server format (e.g., "viseme_6") and apply
    /// </summary>
    public void ApplyVisemeFromString(string visemeString)
    {
        // Parse "viseme_X" format
        if (visemeString.StartsWith("viseme_"))
        {
            string idStr = visemeString.Substring(7); // Remove "viseme_" prefix
            if (int.TryParse(idStr, out int visemeId))
            {
                ApplyViseme(visemeId);
                return;
            }
        }
        Debug.LogWarning($"[VisemeMapper] Invalid viseme string: {visemeString}");
    }

    private void ResetMouthBlendShapes()
    {
        string[] mouthBlendShapes = {
            "jawOpen", "mouthClose", "mouthFunnel", "mouthPucker",
            "mouthSmileLeft", "mouthSmileRight", "mouthStretchLeft", "mouthStretchRight",
            "mouthLowerDownLeft", "mouthLowerDownRight", "mouthUpperUpLeft", "mouthUpperUpRight",
            "mouthPressLeft", "mouthPressRight", "mouthRollLower", "mouthRollUpper",
            "mouthShrugLower", "mouthShrugUpper"
        };

        foreach (string blendShape in mouthBlendShapes)
        {
            if (blendShapeIndices.TryGetValue(blendShape, out int index))
            {
                faceMesh.SetBlendShapeWeight(index, 0f);
            }
        }
    }
}
```

### Integration with PlayPhonemeSequence

```csharp
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

[System.Serializable]
public class PhonemeData
{
    public float time;        // Timestamp in milliseconds
    public string blendshape; // "viseme_0" to "viseme_21"
    public float weight;      // Always 1.0 from server
}

public class AvatarLipSyncController : MonoBehaviour
{
    [SerializeField] private VisemeToARKitMapper visemeMapper;
    
    private List<PhonemeData> phonemeQueue = new();
    private int currentPhonemeIndex = 0;
    private float audioStartTime = 0f;
    private bool isPlaying = false;

    /// <summary>
    /// Called from JavaScript bridge: AvatarController.PlayPhonemeSequence(jsonData)
    /// </summary>
    public void PlayPhonemeSequence(string jsonData)
    {
        Debug.Log($"[LipSync] Received phoneme data: {jsonData.Substring(0, Mathf.Min(200, jsonData.Length))}...");
        
        try
        {
            // Parse JSON array of phonemes
            phonemeQueue = JsonUtility.FromJson<PhonemeDataList>("{\"phonemes\":" + jsonData + "}").phonemes;
            
            Debug.Log($"[LipSync] Parsed {phonemeQueue.Count} phonemes");
            
            currentPhonemeIndex = 0;
            audioStartTime = Time.time * 1000f; // Convert to milliseconds
            isPlaying = true;
            
            StartCoroutine(ProcessPhonemes());
        }
        catch (System.Exception e)
        {
            Debug.LogError($"[LipSync] Failed to parse phoneme data: {e.Message}");
        }
    }

    private IEnumerator ProcessPhonemes()
    {
        while (isPlaying && currentPhonemeIndex < phonemeQueue.Count)
        {
            float elapsedMs = (Time.time * 1000f) - audioStartTime;
            
            // Check if it's time for the next phoneme
            while (currentPhonemeIndex < phonemeQueue.Count && 
                   phonemeQueue[currentPhonemeIndex].time <= elapsedMs)
            {
                var phoneme = phonemeQueue[currentPhonemeIndex];
                visemeMapper.ApplyVisemeFromString(phoneme.blendshape);
                currentPhonemeIndex++;
            }
            
            yield return null; // Wait one frame
        }
        
        // Reset to neutral when done
        visemeMapper.ApplyViseme(0);
        isPlaying = false;
    }

    public void StopLipSync()
    {
        isPlaying = false;
        StopAllCoroutines();
        visemeMapper.ApplyViseme(0);
    }
}

[System.Serializable]
public class PhonemeDataList
{
    public List<PhonemeData> phonemes;
}
```

## ARKit Blend Shape Reference

The following mouth-related blend shapes are typically available in ARKit-compatible avatars:

| Blend Shape Name | Description |
|-----------------|-------------|
| jawOpen | Opens the jaw |
| jawForward | Moves jaw forward |
| jawLeft | Moves jaw left |
| jawRight | Moves jaw right |
| mouthClose | Closes the mouth |
| mouthFunnel | Funnels the lips (O sound) |
| mouthPucker | Puckers the lips |
| mouthSmileLeft | Smiles on left side |
| mouthSmileRight | Smiles on right side |
| mouthFrownLeft | Frowns on left side |
| mouthFrownRight | Frowns on right side |
| mouthDimpleLeft | Creates dimple on left |
| mouthDimpleRight | Creates dimple on right |
| mouthStretchLeft | Stretches mouth left |
| mouthStretchRight | Stretches mouth right |
| mouthRollLower | Rolls lower lip in |
| mouthRollUpper | Rolls upper lip in |
| mouthShrugLower | Shrugs lower lip |
| mouthShrugUpper | Shrugs upper lip |
| mouthPressLeft | Presses lips on left |
| mouthPressRight | Presses lips on right |
| mouthLowerDownLeft | Lowers left lower lip |
| mouthLowerDownRight | Lowers right lower lip |
| mouthUpperUpLeft | Raises left upper lip |
| mouthUpperUpRight | Raises right upper lip |

## Testing & Debugging

### Verify Blend Shape Names
```csharp
void DebugPrintBlendShapes()
{
    var mesh = GetComponent<SkinnedMeshRenderer>().sharedMesh;
    Debug.Log($"Avatar has {mesh.blendShapeCount} blend shapes:");
    for (int i = 0; i < mesh.blendShapeCount; i++)
    {
        Debug.Log($"  [{i}] {mesh.GetBlendShapeName(i)}");
    }
}
```

### Test Viseme Manually
```csharp
void Update()
{
    // Press number keys 0-9 to test visemes
    for (int i = 0; i <= 9; i++)
    {
        if (Input.GetKeyDown(KeyCode.Alpha0 + i))
        {
            visemeMapper.ApplyViseme(i);
            Debug.Log($"Applied viseme {i}");
        }
    }
}
```

## Notes for VaktaAI Integration

1. **Server sends:** `{time: 50, blendshape: "viseme_6", weight: 1.0}`
2. **Unity parses:** Extract viseme ID (6) from "viseme_6"
3. **Mapper applies:** Look up viseme 6 → `{mouthSmileLeft: 60, mouthSmileRight: 60, jawOpen: 10}`
4. **Avatar shows:** Smile expression for "ee" sound

## Troubleshooting

- **No lip movement:** Check if blend shape names match exactly (case-sensitive)
- **Wrong expressions:** Adjust weight values in VisemeMapping dictionary
- **Audio/visual sync issues:** Verify time values are in milliseconds
- **Missing blend shapes:** Avatar may use different naming convention - check mesh.GetBlendShapeName()

---

*Last Updated: November 2025*
*VaktaAI - AI-Powered Study Companion*
